import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Plus,
  ChevronDown,
  MoreHorizontal,
  Search,
  X,
  FileText,
  Pencil,
  Trash2,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Receipt,
  Clock,
  Calendar,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Printer,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/context/OrganizationContext";
import { SalesPDFHeader } from "@/components/sales-pdf-header";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

interface Quote {
  id: string;
  quoteNumber: string;
  referenceNumber?: string;
  date: string;
  expiryDate?: string;
  customerId: string;
  customerName: string;
  total: number;
  status: string;
  convertedTo?: string; // 'invoice' | 'sales-order'
  salesperson?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: any[];
  billingAddress?: any;
  shippingAddress?: any;
  customerNotes?: string;
  termsAndConditions?: string;
  activityLogs?: any[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getStatusBadge = (status: string, convertedTo?: string) => {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Draft", variant: "secondary" },
    SENT: { label: "Sent", variant: "default" },
    ACCEPTED: { label: "Accepted", variant: "default" },
    DECLINED: { label: "Declined", variant: "destructive" },
    CONVERTED: {
      label: convertedTo === 'invoice' ? "Converted to Invoice" :
        convertedTo === 'sales-order' ? "Converted to Sales Order" : "Converted",
      variant: "outline"
    },
    EXPIRED: { label: "Expired", variant: "destructive" },
  };
  const config = statusMap[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Helper function to convert number to words
function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertLessThanOneThousand(n: number): string {
    let result = "";
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + " ";
    }
    return result.trim();
  }

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = Math.floor(num);

  let result = "Indian Rupee ";
  if (crore > 0) result += convertLessThanOneThousand(crore) + " Crore ";
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + " Lakh ";
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + " Thousand ";
  if (remainder > 0) result += convertLessThanOneThousand(remainder);

  result += " Only";
  return result.trim();
}

function QuotePDFView({ quote, branding, organization }: { quote: Quote; branding?: any; organization?: any }) {
  // Calculate tax breakdown (assuming items have tax information)
  const calculateTotals = () => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (quote.items && quote.items.length > 0) {
      quote.items.forEach((item: any) => {
        subtotal += item.amount || 0;
        if (item.cgst) cgst += (item.amount * item.cgst) / 100;
        if (item.sgst) sgst += (item.amount * item.sgst) / 100;
        if (item.igst) igst += (item.amount * item.igst) / 100;
      });
    } else {
      // If no items with tax info, estimate based on total
      subtotal = quote.total / 1.18; // Assuming 18% GST
      cgst = subtotal * 0.09;
      sgst = subtotal * 0.09;
    }

    return { subtotal, cgst, sgst, igst, total: quote.total };
  };

  const totals = calculateTotals();
  const totals = calculateTotals();

  return (
    <div id="pdf-content" className="bg-white max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="border-2 border-slate-800">
        <div className="p-6">
          {/* Standard Sales PDF Header */}
          <SalesPDFHeader
            logo={branding?.logo || undefined}
            documentTitle="Quote"
            documentNumber={quote.quoteNumber}
            date={quote.date}
            referenceNumber={quote.referenceNumber}
            organization={organization}
          />

          {/* Total Badge */}
          <div className="flex justify-end mb-6">
            <div className="p-4 bg-slate-100 border border-slate-300">
              <p className="text-xs text-slate-600 mb-1">Total</p>
              <p className="text-2xl font-bold">{formatCurrency(quote.total)}</p>
            </div>
          </div>

          {/* Quote Metadata */}
          <div className="border-t-2 border-slate-800 pt-4 mb-4">
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-2 w-1/3">
                    <span className="font-semibold">Quote Date:</span> {formatDate(quote.date)}
                  </td>
                  <td className="py-2 w-1/3">
                    <span className="font-semibold">Place Of Supply:</span> {quote.billingAddress?.state || 'Maharashtra (27)'}
                  </td>
                  <td className="py-2 w-1/3">
                    <span className="font-semibold">Expiry Date:</span> {quote.expiryDate ? formatDate(quote.expiryDate) : formatDate(new Date(new Date(quote.date).setDate(new Date(quote.date).getDate() + 30)).toISOString())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bill To & Ship To Side by Side */}
          <div className="mb-4">
            <table className="w-full border-collapse text-xs">
              <tbody>
                <tr>
                  <td className="w-1/2 align-top p-3 border border-slate-400">
                    <div className="font-bold mb-2">Bill To</div>
                    <div className="space-y-1">
                      <p className="font-semibold text-blue-600">{quote.customerName}</p>
                      {quote.billingAddress && (
                        <>
                          {quote.billingAddress.street && <p>{quote.billingAddress.street}</p>}
                          {(quote.billingAddress.city || quote.billingAddress.state) && (
                            <p>
                              {quote.billingAddress.city}
                              {quote.billingAddress.city && quote.billingAddress.state && ', '}
                              {quote.billingAddress.state}
                            </p>
                          )}
                          {quote.billingAddress.pincode && <p>{quote.billingAddress.pincode}</p>}
                          {quote.billingAddress.country && <p>{quote.billingAddress.country}</p>}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="w-1/2 align-top p-3 border border-slate-400 border-l-0">
                    <div className="font-bold mb-2">Ship To</div>
                    <div className="space-y-1">
                      {quote.shippingAddress ? (
                        <>
                          <p className="font-semibold text-blue-600">{quote.customerName}</p>
                          {quote.shippingAddress.street && <p>{quote.shippingAddress.street}</p>}
                          {(quote.shippingAddress.city || quote.shippingAddress.state) && (
                            <p>
                              {quote.shippingAddress.city}
                              {quote.shippingAddress.city && quote.shippingAddress.state && ', '}
                              {quote.shippingAddress.state}
                            </p>
                          )}
                          {quote.shippingAddress.pincode && <p>{quote.shippingAddress.pincode}</p>}
                          {quote.shippingAddress.country && <p>{quote.shippingAddress.country}</p>}
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-blue-600">{quote.customerName}</p>
                          {quote.billingAddress && (
                            <>
                              {quote.billingAddress.street && <p>{quote.billingAddress.street}</p>}
                              {(quote.billingAddress.city || quote.billingAddress.state) && (
                                <p>
                                  {quote.billingAddress.city}
                                  {quote.billingAddress.city && quote.billingAddress.state && ', '}
                                  {quote.billingAddress.state}
                                </p>
                              )}
                              {quote.billingAddress.pincode && <p>{quote.billingAddress.pincode}</p>}
                              {quote.billingAddress.country && <p>{quote.billingAddress.country}</p>}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-slate-400 px-2 py-2 text-left text-xs font-semibold">#</th>
                <th className="border border-slate-400 px-2 py-2 text-left text-xs font-semibold">Item & Description</th>
                <th className="border border-slate-400 px-2 py-2 text-center text-xs font-semibold">HSN/SAC</th>
                <th className="border border-slate-400 px-2 py-2 text-center text-xs font-semibold">Qty</th>
                <th className="border border-slate-400 px-2 py-2 text-right text-xs font-semibold">Rate</th>
                <th className="border border-slate-400 px-2 py-2 text-right text-xs font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.items && quote.items.length > 0 ? (
                quote.items.map((item: any, index: number) => (
                  <tr key={item.id || index}>
                    <td className="border border-slate-400 px-2 py-2 text-xs">{index + 1}</td>
                    <td className="border border-slate-400 px-2 py-2 text-xs">
                      <p className="font-semibold">{item.name}</p>
                      {item.description && <p className="text-slate-600 text-xs mt-0.5">{item.description}</p>}
                    </td>
                    <td className="border border-slate-400 px-2 py-2 text-center text-xs">{item.hsn || item.sac || '1000'}</td>
                    <td className="border border-slate-400 px-2 py-2 text-center text-xs">
                      {item.quantity} {item.unit || 'kg'}
                    </td>
                    <td className="border border-slate-400 px-2 py-2 text-right text-xs">
                      {item.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-slate-400 px-2 py-2 text-right text-xs font-semibold">
                      {item.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="border border-slate-400 px-2 py-3 text-center text-xs text-slate-500">No items available</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Tax Summary and Total in Words */}
          <div className="mb-4">
            <table className="w-full border-collapse text-xs">
              <tbody>
                <tr>
                  <td className="w-1/2 align-top p-3 border border-slate-400">
                    <div className="font-bold mb-2">Total In Words</div>
                    <p className="text-xs leading-relaxed">{numberToWords(quote.total)}</p>
                  </td>
                  <td className="w-1/2 align-top p-0 border border-slate-400 border-l-0">
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="px-3 py-2 border-b border-slate-400">Sub Total</td>
                          <td className="px-3 py-2 text-right border-b border-slate-400">
                            {totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {totals.cgst > 0 && (
                          <tr>
                            <td className="px-3 py-2 border-b border-slate-400">CGST</td>
                            <td className="px-3 py-2 text-right border-b border-slate-400">
                              {totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        {totals.sgst > 0 && (
                          <tr>
                            <td className="px-3 py-2 border-b border-slate-400">SGST</td>
                            <td className="px-3 py-2 text-right border-b border-slate-400">
                              {totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        {totals.igst > 0 && (
                          <tr>
                            <td className="px-3 py-2 border-b border-slate-400">IGST</td>
                            <td className="px-3 py-2 text-right border-b border-slate-400">
                              {totals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )}
                        <tr className="font-bold">
                          <td className="px-3 py-2">Total</td>
                          <td className="px-3 py-2 text-right">{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes Section */}
          {quote.customerNotes && (
            <div className="mb-4 border border-slate-400 p-3">
              <p className="text-xs font-bold mb-2">NOTES</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{quote.customerNotes}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="mb-4 border border-slate-400 p-3">
            <p className="text-xs font-bold mb-2">TERMS & CONDITIONS</p>
            {quote.termsAndConditions ? (
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{quote.termsAndConditions}</p>
            ) : (
              <div className="text-xs leading-relaxed space-y-1">
                <p>Looking forward to your business.</p>
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-slate-800 pt-4">
            <div className="flex justify-between items-end">
              <div className="text-xs text-slate-600">
                <p>Generated on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              </div>
              <div className="text-right">
                {branding?.signature?.url ? (
                  <div className="flex flex-col items-end">
                    <img
                      src={branding.signature.url}
                      alt="Authorized Signature"
                      style={{ maxWidth: '120px', maxHeight: '40px', objectFit: 'contain' }}
                      className="mb-2"
                    />
                    <div className="text-xs font-semibold border-t border-slate-400 pt-1" style={{ width: '120px' }}>
                      Authorized Signature
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div style={{ width: '120px', height: '40px' }} className="mb-2"></div>
                    <div className="text-xs font-semibold border-t border-slate-400 pt-1" style={{ width: '120px' }}>
                      Authorized Signature
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuoteDetailPanelProps {
  quote: Quote;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: (type: string) => void;
  onClone: () => void;
  branding?: any;
}

function QuoteDetailPanel({ quote, onClose, onEdit, onDelete, onConvert, onClone, branding }: QuoteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showPdfView, setShowPdfView] = useState(false);
  const { toast } = useToast();

  const handlePrint = () => {
    const printContent = document.getElementById('pdf-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Quote - ${quote.quoteNumber}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 20px; 
                  color: #1e293b; 
                  background-color: white; 
                }
                .bg-white { background-color: white !important; }
                .border-2 { border: 2px solid #1e293b; }
                .border { border: 1px solid #94a3b8; }
                .border-slate-400 { border-color: #94a3b8; }
                .border-slate-800 { border-color: #1e293b; }
                .border-t-2 { border-top: 2px solid #1e293b; }
                .border-t { border-top: 1px solid #94a3b8; }
                .border-b { border-bottom: 1px solid #94a3b8; }
                .border-l-0 { border-left: 0; }
                .p-6 { padding: 1.5rem; }
                .p-4 { padding: 1rem; }
                .p-3 { padding: 0.75rem; }
                .p-0 { padding: 0; }
                .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
                .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                .pt-4 { padding-top: 1rem; }
                .pt-1 { padding-top: 0.25rem; }
                .pb-4 { padding-bottom: 1rem; }
                .pr-8 { padding-right: 2rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-3 { margin-bottom: 0.75rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-1 { margin-bottom: 0.25rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-0-5 { margin-top: 0.125rem; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-start { align-items: flex-start; }
                .items-end { align-items: flex-end; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-xs { font-size: 0.75rem; line-height: 1rem; }
                .text-sm { font-size: 0.875rem; }
                .text-lg { font-size: 1.125rem; }
                .text-2xl { font-size: 1.5rem; }
                .text-4xl { font-size: 2.25rem; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                .text-slate-600 { color: #475569; }
                .text-slate-700 { color: #334155; }
                .text-blue-600 { color: #2563eb; }
                .bg-slate-100 { background-color: #f1f5f9; }
                .bg-slate-200 { background-color: #e2e8f0; }
                .leading-relaxed { line-height: 1.625; }
                .space-y-1 > * + * { margin-top: 0.25rem; }
                .flex-1 { flex: 1 1 0%; }
                .w-1-2 { width: 50%; }
                .w-1-3 { width: 33.333%; }
                .max-w-4xl { max-width: 56rem; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .align-top { vertical-align: top; }
                .whitespace-pre-wrap { white-space: pre-wrap; }
                table { 
                  width: 100%; 
                  border-collapse: collapse; 
                }
                th { 
                  background-color: #e2e8f0 !important; 
                  color: #1e293b !important; 
                  padding: 0.5rem; 
                  text-align: left;
                  font-size: 0.75rem;
                  font-weight: 600;
                  border: 1px solid #94a3b8;
                }
                td { 
                  padding: 0.5rem; 
                  font-size: 0.75rem;
                  vertical-align: top;
                }
                @media print {
                  body { padding: 10px; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } else {
      setShowPdfView(true);
      setTimeout(handlePrint, 100);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("pdf-content");
    if (!element || !quote) return;

    const originalStyle = element.style.cssText;

    element.style.backgroundColor = "#ffffff";
    element.style.color = "#0f172a";
    element.style.width = "800px";
    element.style.maxWidth = "none";

    try {
      const polyfillStyles = document.createElement('style');
      polyfillStyles.innerHTML = `
        * {
          --tw-ring-color: transparent !important;
          --tw-ring-offset-color: transparent !important;
          --tw-ring-shadow: none !important;
          --tw-shadow: none !important;
          --tw-shadow-colored: none !important;
          outline-color: transparent !important;
          caret-color: transparent !important;
          accent-color: transparent !important;
        }
      `;
      document.head.appendChild(polyfillStyles);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 800,
        onclone: (clonedDoc: Document) => {
          const clonedElement = clonedDoc.getElementById("pdf-content");
          if (clonedElement) {
            clonedElement.style.width = "800px";
            clonedElement.style.maxWidth = "none";
            clonedElement.style.backgroundColor = "#ffffff";
            clonedElement.style.color = "#0f172a";

            const clonedAll = clonedDoc.querySelectorAll("*");
            clonedAll.forEach((el) => {
              const htmlEl = el as HTMLElement;

              const inlineStyle = htmlEl.getAttribute('style') || '';
              if (inlineStyle.includes('oklch') || inlineStyle.includes('oklab')) {
                htmlEl.setAttribute('style', inlineStyle.replace(/ok(lch|lab)\([^)]+\)/g, 'inherit'));
              }

              const computed = window.getComputedStyle(htmlEl);

              const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke', 'stopColor', 'floodColor', 'lightingColor'];
              colorProps.forEach(prop => {
                const value = computed[prop as any];
                if (value && (value.includes('oklch') || value.includes('oklab'))) {
                  if (prop === 'color') htmlEl.style.setProperty('color', '#0f172a', 'important');
                  else if (prop === 'backgroundColor') htmlEl.style.setProperty('background-color', 'transparent', 'important');
                  else if (prop === 'borderColor') htmlEl.style.setProperty('border-color', '#e2e8f0', 'important');
                  else htmlEl.style.setProperty(prop, 'inherit', 'important');
                }
              });

              htmlEl.style.setProperty("--tw-ring-color", "transparent", "important");
              htmlEl.style.setProperty("--tw-ring-offset-color", "transparent", "important");
              htmlEl.style.setProperty("--tw-ring-shadow", "none", "important");
              htmlEl.style.setProperty("--tw-shadow", "none", "important");
              htmlEl.style.setProperty("--tw-shadow-colored", "none", "important");
            });
          }
        },
      });

      document.head.removeChild(polyfillStyles);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight,
        undefined,
        "FAST",
      );
      pdf.save(`Quote-${quote.quoteNumber}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: `Quote-${quote.quoteNumber}.pdf has been downloaded successfully.`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: "Failed to download PDF", variant: "destructive" });
    } finally {
      element.style.cssText = originalStyle;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white" data-testid="text-quote-number">{quote.quoteNumber}</h2>
            <p className="text-sm text-slate-500">{quote.customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} data-testid="button-edit-quote">
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-1.5" size="sm" data-testid="button-convert">
                Convert
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onConvert("sales-order")} data-testid="menu-item-convert-sales-order">
                <ShoppingCart className="mr-2 h-4 w-4" /> To Sales Order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onConvert("invoice")} data-testid="menu-item-convert-invoice">
                <Receipt className="mr-2 h-4 w-4" /> To Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-more-actions">
                More
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem data-testid="menu-item-send">
                <Send className="mr-2 h-4 w-4" /> Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint} data-testid="menu-item-print">
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPDF} data-testid="menu-item-download">
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onClone} data-testid="menu-item-clone">
                <Copy className="mr-2 h-4 w-4" /> Clone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-item-accept">
                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Accepted
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-item-decline">
                <XCircle className="mr-2 h-4 w-4" /> Mark as Declined
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={onDelete} data-testid="menu-item-delete">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} data-testid="button-close-panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Label htmlFor="pdf-view" className="text-sm text-slate-500">Show PDF View</Label>
          <Switch
            id="pdf-view"
            checked={showPdfView}
            onCheckedChange={(checked) => {
              console.log('Switch toggled:', checked);
              setShowPdfView(checked);
            }}
            data-testid="switch-pdf-view"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {showPdfView ? (
          <QuotePDFView quote={quote} branding={branding} organization={currentOrganization || undefined} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center px-0 border-b border-slate-200 dark:border-slate-700">
              <TabsList className="h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                  data-testid="tab-overview"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-3"
                  data-testid="tab-activity"
                >
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="flex-1 overflow-auto mt-0">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500">Quote Number</p>
                    <p className="font-medium">{quote.quoteNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Status</p>
                    <div className="mt-1">{getStatusBadge(quote.status, quote.convertedTo)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Quote Date</p>
                    <p className="font-medium">{formatDate(quote.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Expiry Date</p>
                    <p className="font-medium">{quote.expiryDate ? formatDate(quote.expiryDate) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="font-medium text-blue-600">{quote.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Salesperson</p>
                    <p className="font-medium">{quote.salesperson || '-'}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold mb-4">Amount</h4>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(quote.total)}
                  </div>
                </div>

                {quote.items && quote.items.length > 0 && (
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold mb-4">Items</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="py-2">Item</th>
                          <th className="py-2 text-right">Qty</th>
                          <th className="py-2 text-right">Rate</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.items.map((item: any, index: number) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="py-2">{item.name}</td>
                            <td className="py-2 text-right">{item.quantity}</td>
                            <td className="py-2 text-right">{formatCurrency(item.rate)}</td>
                            <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-auto mt-0">
              <div className="p-6">
                {quote.activityLogs && quote.activityLogs.length > 0 ? (
                  <div className="space-y-4">
                    {quote.activityLogs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{log.description}</p>
                          <p className="text-sm text-slate-500">
                            {log.user} - {formatDate(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No activity recorded</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default function Estimates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    fetchQuotes();
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await fetch("/api/branding");
      const data = await response.json();
      if (data.success) {
        setBranding(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch branding:", error);
    }
  };

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes');
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteClick = (quote: Quote) => {
    setSelectedQuote(quote);
  };

  const handleClosePanel = () => {
    setSelectedQuote(null);
  };

  const handleEditQuote = () => {
    if (selectedQuote) {
      setLocation(`/estimates/${selectedQuote.id}/edit`);
    }
  };

  const toggleSelectQuote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedQuotes.includes(id)) {
      setSelectedQuotes(selectedQuotes.filter(i => i !== id));
    } else {
      setSelectedQuotes([...selectedQuotes, id]);
    }
  };

  const handleDeleteClick = () => {
    if (selectedQuote) {
      setQuoteToDelete(selectedQuote.id);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!quoteToDelete) return;
    try {
      const response = await fetch(`/api/quotes/${quoteToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: "Quote deleted successfully" });
        handleClosePanel();
        fetchQuotes();
      }
    } catch (error) {
      toast({ title: "Failed to delete quote", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  const handleConvert = async (type: string) => {
    if (!selectedQuote) return;

    try {
      const endpoint = type === 'invoice'
        ? `/api/quotes/${selectedQuote.id}/convert-to-invoice`
        : `/api/quotes/${selectedQuote.id}/convert-to-sales-order`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        const targetType = type === 'invoice' ? 'Invoice' : 'Sales Order';
        const targetNumber = type === 'invoice'
          ? result.data?.invoice?.invoiceNumber || result.data?.invoiceNumber
          : result.data?.salesOrder?.orderNumber || result.data?.orderNumber;

        toast({
          title: "Quote Converted",
          description: `Quote converted to ${targetType}${targetNumber ? ' ' + targetNumber : ''}`,
        });

        // Refresh quotes to show updated status
        fetchQuotes();
        handleClosePanel();
      } else {
        throw new Error('Failed to convert');
      }
    } catch (error) {
      console.error('Error converting quote:', error);
      toast({
        title: "Conversion Failed",
        description: `Failed to convert quote to ${type === 'invoice' ? 'Invoice' : 'Sales Order'}`,
        variant: "destructive"
      });
    }
  };

  const handleClone = async () => {
    if (!selectedQuote) return;
    setLocation(`/quotes/create?cloneFrom=${selectedQuote.id}`);
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch =
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { currentPage, totalPages, totalItems, itemsPerPage, paginatedItems, goToPage } = usePagination(filteredQuotes, 10);

  return (
    <div className="flex h-[calc(100vh-80px)] animate-in fade-in duration-300 w-full overflow-hidden bg-slate-50">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full" autoSaveId="estimates-layout">
        <ResizablePanel
          defaultSize={selectedQuote ? 30 : 100}
          minSize={20}
          className="flex flex-col overflow-hidden bg-white"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">All Quotes</h1>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Quotes</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("DRAFT")}>Draft</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("SENT")}>Sent</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("ACCEPTED")}>Accepted</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("CONVERTED")}>Converted</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("DECLINED")}>Declined</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setLocation("/estimates/create")}
                  className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-9"
                  data-testid="button-new-quote"
                >
                  <Plus className="h-4 w-4" /> New
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading quotes...</div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="mb-4">No quotes found.</p>
                    <Button
                      onClick={() => setLocation("/estimates/create")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Create your first quote
                    </Button>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="w-10 px-3 py-3 text-left">
                            <Checkbox
                              checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedQuotes.length === filteredQuotes.length) {
                                  setSelectedQuotes([]);
                                } else {
                                  setSelectedQuotes(filteredQuotes.map(q => q.id));
                                }
                              }}
                            />
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quote Number</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference#</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Name</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                          <th className="w-10 px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {paginatedItems.map((quote) => (
                          <tr
                            key={quote.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${selectedQuote?.id === quote.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            onClick={() => handleQuoteClick(quote)}
                            data-testid={`row-quote-${quote.id}`}
                          >
                            <td className="px-3 py-3">
                              <Checkbox
                                checked={selectedQuotes.includes(quote.id)}
                                onClick={(e) => toggleSelectQuote(quote.id, e)}
                              />
                            </td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                              {formatDate(quote.date)}
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-medium text-blue-600 dark:text-blue-400">{quote.quoteNumber}</span>
                            </td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                              {quote.referenceNumber || '-'}
                            </td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                              {quote.customerName}
                            </td>
                            <td className="px-3 py-3">
                              {getStatusBadge(quote.status, quote.convertedTo)}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-400">
                              {formatCurrency(quote.total)}
                            </td>
                            <td className="px-3 py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Search className="h-4 w-4 text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuoteClick(quote); }}>
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={goToPage}
                />
              </>
            )}
            </div>
          </div>
        </ResizablePanel>

        {selectedQuote && (
          <>
            <ResizableHandle withHandle className="w-1 bg-slate-200 hover:bg-blue-400 hover:w-1.5 transition-all cursor-col-resize" />
            <ResizablePanel defaultSize={70} minSize={30} className="bg-white">
              <div className="h-full flex flex-col overflow-hidden bg-white">
                <QuoteDetailPanel
                  quote={selectedQuote}
                  branding={branding}
                  onClose={handleClosePanel}
                  onEdit={handleEditQuote}
                  onDelete={handleDeleteClick}
                  onConvert={handleConvert}
                  onClone={handleClone}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
