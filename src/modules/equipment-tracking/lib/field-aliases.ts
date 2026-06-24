export const FIELD_ALIASES = {
  seq: ["Sequence", "Seq", "Line", "Line Number", "Item", "Item Number", "No", "Number"],
  mfr: ["Manufacturer", "Mfr", "MFG", "Manufacture", "Vendor", "Brand", "Make"],
  product: ["Product", "Product ID", "Part #", "Part Number", "Model", "SKU", "Catalog Number", "Item ID"],
  desc: ["Description", "Product Description", "Item Description", "Name", "Product Name", "Long Description"],
  qty: ["Qty", "Quantity", "Order Qty", "Order Quantity", "Count"],
  stockAllocation: ["Stock Allocation", "Stock Alloc", "Warehouse Allocation", "Allocation", "Allocated"],
  specialOrder: ["Special Order", "Special Order Date", "SO Date", "Ordered Date", "PO Date"],
  pickedQty: ["Picked Quantity", "Picked Qty", "Qty Picked", "Received Quantity", "Received Qty"],
  shippedQty: ["Shipped Quantity", "Shipped Qty", "Qty Shipped"],
  cancelled: ["Cancelled", "Canceled", "Cancelled Date", "Canceled Date", "Cancellation"],
} as const;
