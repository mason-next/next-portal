export const FIELD_ALIASES = {
  seq: ["Sequence", "Seq", "Line", "Line Number", "Item", "Item Number", "No", "Number"],
  mfr: ["Manufacturer", "Mfr", "MFG", "Manufacture", "Vendor", "Brand", "Make"],
  part: [
    "Product ID",
    "Part #",
    "Part Number",
    "Model",
    "SKU",
    "Catalog Number",
    "Catalog",
    "Item ID",
    "Product",
  ],
  desc: ["Description", "Product Description", "Item Description", "Name", "Product Name", "Long Description"],
  qty: ["Qty", "Quantity", "Count"],
  notes: ["Notes", "Note", "Comments", "Comment"],
  unitCost: ["Unit Cost", "Cost", "Price", "Sell Price", "Unit Price", "Net Cost"],
} as const;
