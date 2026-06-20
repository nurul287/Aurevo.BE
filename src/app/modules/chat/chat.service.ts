import Anthropic from "@anthropic-ai/sdk";
import { ilike, eq, and, lte, gte, SQL, desc } from "drizzle-orm";
import { db } from "../../../db";
import { products, categories, brands, productVariants } from "../../../db/schema";
import { config } from "../../config";

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  return _anthropic;
}

// ─── Tool Definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_products",
    description: "Search the product catalog by name, category, brand, gender, or price range. Use this when the user asks about products, recommendations, or availability.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search term for product name or description" },
        categoryName: { type: "string", description: "Filter by category name (e.g., 'Sneakers', 'T-Shirts')" },
        brandName: { type: "string", description: "Filter by brand name" },
        gender: { type: "string", enum: ["men", "women", "unisex"], description: "Filter by gender" },
        minPrice: { type: "number", description: "Minimum price filter" },
        maxPrice: { type: "number", description: "Maximum price filter" },
        limit: { type: "number", description: "Max results to return (default 5, max 10)" },
      },
      required: [],
    },
  },
  {
    name: "get_product_details",
    description: "Get full details for a specific product including variants, images, and stock levels.",
    input_schema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Product slug" },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_categories",
    description: "List all product categories available in the store.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ─── Tool Handlers ─────────────────────────────────────────────────────────────

async function handleToolCall(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  if (toolName === "search_products") {
    const conditions: SQL[] = [eq(products.isActive, true)];

    if (toolInput.query) {
      conditions.push(ilike(products.name, `%${toolInput.query}%`));
    }
    if (toolInput.gender) {
      conditions.push(eq(products.gender, toolInput.gender as "men" | "women" | "unisex"));
    }
    if (toolInput.minPrice) {
      conditions.push(gte(products.basePrice, String(toolInput.minPrice)));
    }
    if (toolInput.maxPrice) {
      conditions.push(lte(products.basePrice, String(toolInput.maxPrice)));
    }

    const limit = Math.min(Number(toolInput.limit ?? 5), 10);
    const rows = await db.select({
      id: products.id, name: products.name, slug: products.slug,
      basePrice: products.basePrice, gender: products.gender,
    }).from(products).where(and(...conditions)).orderBy(desc(products.createdAt)).limit(limit);

    if (rows.length === 0) return "No products found matching the search criteria.";
    return JSON.stringify(rows, null, 2);
  }

  if (toolName === "get_product_details") {
    const [product] = await db.select().from(products).where(eq(products.slug, String(toolInput.slug)));
    if (!product) return `Product with slug "${toolInput.slug}" not found.`;

    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));
    return JSON.stringify({ ...product, variants }, null, 2);
  }

  if (toolName === "get_categories") {
    const cats = await db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).where(eq(categories.isActive, true));
    return JSON.stringify(cats, null, 2);
  }

  return "Unknown tool.";
}

// ─── Streaming Chat ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Aurevo, a helpful and friendly AI shopping assistant for Aurevo Fashion — a premium fashion e-commerce store. You help customers discover products, find their size, compare items, and make purchase decisions.

Guidelines:
- Be concise, warm, and helpful
- When asked about products, use the search_products tool to find relevant items
- When a customer asks about a specific product, use get_product_details
- Format prices clearly (e.g., BDT 1,999)
- If a product is out of stock, suggest alternatives
- Do not make up product details — always use the tools to get real data`;

export async function* streamChat(message: string): AsyncGenerator<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: message }];

  // Agentic tool-use loop
  while (true) {
    const response = await getClient().messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Yield text chunks as they come
    for (const block of response.content) {
      if (block.type === "text") {
        // Yield in chunks to simulate streaming (real streaming needs stream: true)
        yield block.text;
      }
    }

    if (response.stop_reason === "end_turn") break;

    // Process tool calls
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

      // Add assistant turn with tool use
      messages.push({ role: "assistant", content: response.content });

      // Execute tools and add results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await handleToolCall(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }
}
