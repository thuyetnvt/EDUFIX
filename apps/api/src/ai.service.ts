import { Injectable } from "@nestjs/common";
import { IncidentStatus, Priority } from "@prisma/client";
import { PrismaService } from "./prisma.service";

export type IncidentSuggestion = {
  category: string;
  issueType: string;
  suggestedPriority: Priority;
  summary: string;
  confidence: number;
  possibleCauses: string[];
  provider: string;
  model?: string;
};

export interface IncidentAssistant {
  classify(
    title: string,
    description: string,
    assetCategory?: string,
    locationContext?: string,
  ): Promise<IncidentSuggestion>;
}

export class RuleBasedIncidentAssistant implements IncidentAssistant {
  async classify(
    title: string,
    description: string,
    _assetCategory?: string,
    _locationContext?: string,
  ): Promise<IncidentSuggestion> {
    const text = `${title} ${description}`.toLowerCase();
    if (
      text.includes("máy chiếu") ||
      text.includes("hdmi") ||
      text.includes("trình chiếu")
    )
      return {
        category: "PROJECTOR",
        issueType: "NO_SIGNAL",
        suggestedPriority: Priority.HIGH,
        summary: "Máy chiếu không nhận tín hiệu đầu vào",
        confidence: 0.9,
        possibleCauses: [
          "Cáp HDMI hỏng",
          "Sai nguồn đầu vào",
          "Cổng kết nối bị lỗi",
        ],
        provider: "rule-based",
      };
    if (text.includes("điều hòa") || text.includes("không lạnh"))
      return {
        category: "AIR_CONDITIONER",
        issueType: "COOLING",
        suggestedPriority: Priority.HIGH,
        summary: "Điều hòa hoạt động không đạt yêu cầu",
        confidence: 0.86,
        possibleCauses: [
          "Thiếu môi chất lạnh",
          "Lưới lọc bẩn",
          "Lỗi nguồn điện",
        ],
        provider: "rule-based",
      };
    if (text.includes("máy in") || text.includes("kẹt giấy"))
      return {
        category: "PRINTER",
        issueType: "PAPER_JAM",
        suggestedPriority: Priority.MEDIUM,
        summary: "Sự cố máy in",
        confidence: 0.88,
        possibleCauses: ["Kẹt giấy", "Khay giấy lệch", "Con lăn bẩn"],
        provider: "rule-based",
      };
    if (text.includes("máy tính") || text.includes("khởi động"))
      return {
        category: "COMPUTER",
        issueType: "BOOT_FAILURE",
        suggestedPriority: Priority.HIGH,
        summary: "Máy tính không khởi động",
        confidence: 0.84,
        possibleCauses: [
          "Nguồn điện hoặc bộ nguồn lỗi",
          "RAM lỏng",
          "Ổ lưu trữ gặp sự cố",
        ],
        provider: "rule-based",
      };
    if (
      text.includes("wifi") ||
      text.includes("wi-fi") ||
      text.includes("mạng")
    )
      return {
        category: "NETWORK",
        issueType: "UNSTABLE_CONNECTION",
        suggestedPriority: Priority.MEDIUM,
        summary: "Kết nối mạng không ổn định",
        confidence: 0.82,
        possibleCauses: [
          "Router quá tải",
          "Nhiễu tín hiệu",
          "Lỗi đường truyền",
        ],
        provider: "rule-based",
      };
    return {
      category: "OTHER",
      issueType: "GENERAL",
      suggestedPriority: Priority.MEDIUM,
      summary: title,
      confidence: 0.55,
      possibleCauses: ["Cần kỹ thuật viên kiểm tra trực tiếp"],
      provider: "rule-based",
    };
  }
}

export class OpenAiIncidentAssistant implements IncidentAssistant {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async classify(
    title: string,
    description: string,
    assetCategory?: string,
    locationContext?: string,
  ): Promise<IncidentSuggestion> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Phân loại sự cố thiết bị trường học. Chỉ trả JSON gồm category, issueType, suggestedPriority (URGENT|HIGH|MEDIUM|LOW), summary, confidence (0..1), possibleCauses (string[]).",
              },
              {
                role: "user",
                content: JSON.stringify({
                  title,
                  description,
                  assetCategory,
                  locationContext,
                }),
              },
            ],
          }),
        },
      );
      if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
      const payload = (await response.json()) as any;
      const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
      if (
        !Object.values(Priority).includes(parsed.suggestedPriority) ||
        typeof parsed.summary !== "string" ||
        !Array.isArray(parsed.possibleCauses)
      )
        throw new Error("OpenAI output không hợp lệ");
      return {
        category: String(parsed.category ?? "OTHER"),
        issueType: String(parsed.issueType ?? "GENERAL"),
        suggestedPriority: parsed.suggestedPriority,
        summary: parsed.summary,
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
        possibleCauses: parsed.possibleCauses.map(String).slice(0, 5),
        provider: "openai",
        model: this.model,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

@Injectable()
export class AiService {
  private readonly fallback = new RuleBasedIncidentAssistant();
  constructor(private readonly prisma: PrismaService) {}

  async classify(
    title: string,
    description: string,
    assetCategory?: string,
    locationContext?: string,
  ) {
    const key = process.env.OPENAI_API_KEY;
    const provider = process.env.AI_PROVIDER;
    if (key && provider === "openai") {
      try {
        return await new OpenAiIncidentAssistant(
          key,
          process.env.OPENAI_MODEL || "gpt-4.1-mini",
        ).classify(title, description, assetCategory, locationContext);
      } catch {
        return this.fallback.classify(
          title,
          description,
          assetCategory,
          locationContext,
        );
      }
    }
    return this.fallback.classify(
      title,
      description,
      assetCategory,
      locationContext,
    );
  }

  private words(value: string) {
    return new Set(
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2),
    );
  }
  private similarity(left: string, right: string) {
    const a = this.words(left);
    const b = this.words(right);
    const intersection = [...a].filter((word) => b.has(word)).length;
    const union = new Set([...a, ...b]).size;
    return union ? intersection / union : 0;
  }

  async findDuplicates(assetId: string, title: string, description: string) {
    const candidates = await this.prisma.incident.findMany({
      where: {
        assetId,
        status: { notIn: [IncidentStatus.COMPLETED, IncidentStatus.CANCELLED] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        incidentCode: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });
    return candidates
      .map((candidate) => ({
        ...candidate,
        score: Number(
          this.similarity(
            `${title} ${description}`,
            `${candidate.title} ${candidate.description}`,
          ).toFixed(3),
        ),
        explanation: "Cùng thiết bị, đang hoạt động và có nội dung tương tự",
      }))
      .filter((candidate) => candidate.score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
}
