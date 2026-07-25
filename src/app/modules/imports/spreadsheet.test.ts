import { describe, expect, it } from "vitest";
import XLSX from "xlsx";
import { generateImportTemplate, parseSpreadsheet } from "./spreadsheet";

describe("generateImportTemplate + parseSpreadsheet round trip", () => {
  it("parses its own template into one valid NormalizedProduct with fanned-out size variants and ordered images", () => {
    const buffer = generateImportTemplate();
    const { rows, errors } = parseSpreadsheet(buffer, "spreadsheet");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);

    const product = rows[0]!.product;
    expect(product.title).toBe("Classic Oxford Shirt");
    expect(product.category).toBe("shirt");
    expect(product.basePrice).toBe(1490);
    expect(product.compareAtPrice).toBe(1990);
    expect(product.tags).toEqual(["cotton", "formal"]);

    expect(product.variants).toHaveLength(4);
    expect(product.variants.map((v) => v.size)).toEqual(["S", "M", "L", "XL"]);
    expect(product.variants[0]!.sku).toBe("SHIRT-OXFORD-S");
    expect(product.variants[0]!.stock).toBe(20);

    expect(product.images).toHaveLength(2);
    expect(product.images[0]!.isPrimary).toBe(true);
    expect(product.images[1]!.isPrimary).toBe(false);
    expect(product.images[0]!.sortOrder).toBe(0);
    expect(product.images[1]!.sortOrder).toBe(1);
  });

  it("parses the same template re-saved as CSV text via XLSX's auto-detection", () => {
    const xlsxBuffer = generateImportTemplate();
    const workbook = XLSX.read(xlsxBuffer, { type: "buffer" });
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]!]!);
    const csvBuffer = Buffer.from(csv, "utf-8");

    const { rows, errors } = parseSpreadsheet(csvBuffer, "spreadsheet");
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.product.title).toBe("Classic Oxford Shirt");
  });
});

describe("parseSpreadsheet — validation and edge cases", () => {
  function bufferFromRows(headerRow: string[], dataRows: unknown[][]): Buffer {
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  const HEADERS = [
    "external_id", "title", "description", "short_description", "brand", "category",
    "gender", "base_price", "compare_at_price", "color", "color_code", "sizes",
    "stock", "sku_prefix", "tags", "image_urls",
  ];

  it("collects a bad row's error without discarding a good row in the same batch", () => {
    const buffer = bufferFromRows(HEADERS, [
      // Not fully blank (category/gender are set) so it reaches validation —
      // blank title + unparsable price should both surface as errors.
      ["", "", "", "", "", "t-shirt", "men", "not-a-number", "", "", "", "", "", "", "", ""],
      ["good-1", "Plain Tee", "", "", "", "t-shirt", "men", "990", "", "", "", "S|M", "5", "TEE", "", ""],
    ]);

    const { rows, errors } = parseSpreadsheet(buffer, "spreadsheet");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.product.title).toBe("Plain Tee");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.rowNumber).toBe(2);
    expect(errors[0]!.error).toMatch(/title|basePrice/);
  });

  it("skips fully blank trailing rows instead of reporting them as errors", () => {
    const buffer = bufferFromRows(HEADERS, [
      ["row-1", "Cap One", "", "", "", "cap", "unisex", "500", "", "", "", "", "10", "CAP", "", ""],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ]);

    const { rows, errors } = parseSpreadsheet(buffer, "spreadsheet");
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("produces a single sizeless variant when the sizes column is blank", () => {
    const buffer = bufferFromRows(HEADERS, [
      ["watch-1", "Steel Watch", "", "", "", "watch", "men", "3500", "", "Silver", "#c0c0c0", "", "8", "WATCH", "", ""],
    ]);

    const { rows, errors } = parseSpreadsheet(buffer, "spreadsheet");
    expect(errors).toHaveLength(0);
    expect(rows[0]!.product.variants).toHaveLength(1);
    expect(rows[0]!.product.variants[0]!.size).toBeUndefined();
    expect(rows[0]!.product.variants[0]!.color).toBe("Silver");
    expect(rows[0]!.product.variants[0]!.stock).toBe(8);
  });

  it("derives a stable external_id from title+row when the column is left blank", () => {
    const buffer = bufferFromRows(HEADERS, [
      ["", "Panjabi Set Deluxe", "", "", "", "panjabi", "men", "2200", "", "", "", "", "", "", "", ""],
    ]);

    const { rows } = parseSpreadsheet(buffer, "spreadsheet");
    expect(rows[0]!.product.externalId).toBe("row-2-panjabi-set-deluxe");
  });

  it("matches column headers case-insensitively with whitespace normalized to underscores", () => {
    const buffer = bufferFromRows(
      ["External Id", "Title", "Category", "Base Price"],
      [["sneaker-1", "Runner X", "sneakers", "4500"]],
    );

    const { rows, errors } = parseSpreadsheet(buffer, "spreadsheet");
    expect(errors).toHaveLength(0);
    expect(rows[0]!.product.externalId).toBe("sneaker-1");
    expect(rows[0]!.product.basePrice).toBe(4500);
  });
});
