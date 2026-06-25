import { renderEmailHtml, renderEmailPlainText } from "../engine/render";
import type { EmailTemplateContent } from "../engine/types";

export interface RmaRequestInput {
  projectName: string;
  projectNumber: string;
  seq: string;
  mfr: string;
  product: string;
  desc: string;
  orderedQty: number;
  returnQty: number;
  reason: string;
  requestedByName: string;
  requestedByEmail: string;
}

export interface RmaRequestResult {
  subject: string;
  html: string;
  plainText: string;
}

export function buildRmaRequestEmail(input: RmaRequestInput): RmaRequestResult {
  const subject = `RMA Request – ${input.product} (#${input.projectNumber})`;

  const content: EmailTemplateContent = {
    greeting: "Return Merchandise Authorization Request",
    intro: ["Please process an RMA for the item below."],
    sections: [
      {
        heading: "Item Details",
        notes: [
          `Project: ${input.projectName} (#${input.projectNumber})`,
          `Line Item: ${input.seq}`,
          `Manufacturer: ${input.mfr}`,
          `Product: ${input.product}`,
          `Description: ${input.desc}`,
          `Quantity to Return: ${input.returnQty} of ${input.orderedQty} ordered`,
        ],
      },
      {
        heading: "Reason for Return",
        intro: input.reason.trim() || "Not specified.",
      },
    ],
    closing: ["Please confirm the RMA number and return shipping instructions at your earliest convenience."],
    signOffLine: "Submitted by,",
    signatureLines: [input.requestedByName, input.requestedByEmail].filter((line) => line.trim() !== ""),
  };

  return {
    subject,
    html: renderEmailHtml(content),
    plainText: renderEmailPlainText(content, subject),
  };
}
