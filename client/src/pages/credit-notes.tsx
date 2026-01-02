import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useOrganization } from "@/context/OrganizationContext";
import { SalesPDFHeader } from "@/components/sales-pdf-header";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  X,
  Send,
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";

interface CreditNoteListItem {
  id: string;
  date: string;
  creditNoteNumber: string;
  referenceNumber: string;
  customerName: string;
  invoiceNumber: string;
  status: string;
  total: number;
  creditsRemaining: number;
}

interface CreditNoteItem {
  id: string;
  itemId: string;
  name: string;
  description: string;
  account: string;
  quantity: number;
  rate: number;
  discount: number;
  discountType: string;
  tax: number;
  taxName: string;
  amount: number;
}

interface CreditNoteDetail {
  id: string;
  creditNoteNumber: string;
  referenceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  reason: string;
  salesperson: string;
  subject: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  gstin: string;
  placeOfSupply: string;
  items: CreditNoteItem[];
  subTotal: number;
  shippingCharges: number;
  tdsType: string;
  tdsAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  adjustment: number;
  total: number;
  creditsRemaining: number;
  customerNotes: string;
  termsAndConditions: string;
  status: string;
  pdfTemplate: string;
  createdAt: string;
  createdBy: string;
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatAddress = (address: any) => {
  if (!address) return ['-'];
  const parts = [address.street, address.city, address.state, address.country, address.pincode].filter(Boolean);
  return parts.length > 0 ? parts : ['-'];
};

const getStatusBadgeStyles = (status: string) => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'closed' || statusLower === 'applied') {
    return 'bg-green-100 text-green-700 border-green-200';
  }
  if (statusLower === 'open' || statusLower === 'draft') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (statusLower === 'void') {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

function CreditNotePdfPreview({ creditNote, branding, organization }: { creditNote: CreditNoteDetail; branding?: any; organization?: any }) {
  return (
    <div id="pdf-content" className="bg-white p-8 text-black min-h-full" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-3xl mx-auto">
        <div className="relative mb-8">
          {creditNote.status === 'CLOSED' && (
            <div className="absolute top-0 left-0 transform -rotate-12">
              <span className="inline-block bg-green-500 text-white px-4 py-1 text-sm font-bold rounded">CLOSED</span>
            </div>
          )}
          <SalesPDFHeader
            organization={organization}
            logo={branding?.logo}
            documentTitle="CREDIT NOTE"
            documentNumber={creditNote.creditNoteNumber}
            date={creditNote.date}
          />
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <div className="text-sm mb-2">
              <span className="text-gray-500">#</span>
              <span className="ml-2 font-medium">{creditNote.creditNoteNumber}</span>
            </div>
            <div className="text-sm mb-2">
              <span className="text-gray-500">Credit Date</span>
              <span className="ml-2">: {formatDate(creditNote.date)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Ref</span>
              <span className="ml-2">: {creditNote.referenceNumber || '-'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm mb-2">
              <span className="text-gray-500">Place Of Supply</span>
              <span className="ml-2">{creditNote.placeOfSupply || '-'}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
          <p className="font-semibold text-blue-600">{creditNote.customerName}</p>
          <div className="text-sm text-gray-600">
            {formatAddress(creditNote.billingAddress).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          {creditNote.gstin && <p className="text-sm text-gray-600">GSTIN: {creditNote.gstin}</p>}
        </div>

        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-3 py-2 text-left font-semibold">#</th>
              <th className="px-3 py-2 text-left font-semibold">Item & Description</th>
              <th className="px-3 py-2 text-left font-semibold">HSN/SAC</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Rate</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {creditNote.items.map((item, index) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium">{item.name}</p>
                  {item.description && <p className="text-gray-600 text-xs">{item.description}</p>}
                </td>
                <td className="px-3 py-2">-</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.rate)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Sub Total</span>
              <span className="font-medium">{formatCurrency(creditNote.subTotal)}</span>
            </div>
            {creditNote.cgst > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">CGST 9%</span>
                <span className="font-medium">{formatCurrency(creditNote.cgst)}</span>
              </div>
            )}
            {creditNote.sgst > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">SGST 9%</span>
                <span className="font-medium">{formatCurrency(creditNote.sgst)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 font-bold">
              <span>Total</span>
              <span>{formatCurrency(creditNote.total)}</span>
            </div>
            <div className="flex justify-between py-2 bg-amber-50 px-2">
              <span className="font-medium">Credits Remaining</span>
              <span className="font-bold text-amber-600">{formatCurrency(creditNote.creditsRemaining)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-4 text-right text-sm text-gray-500">
          {branding?.signature?.url ? (
            <div className="flex flex-col items-end gap-2">
              <img
                src={branding.signature.url}
                alt="Authorized Signature"
                style={{ maxWidth: '180px', maxHeight: '60px', objectFit: 'contain' }}
              />
              <p className="text-xs">Authorized Signature</p>
            </div>
          ) : (
            <p>Authorized Signature ____________________</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface CreditNoteDetailPanelProps {
  creditNote: CreditNoteDetail;
  branding?: any;
  organization?: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CreditNoteDetailPanel({ creditNote, branding, organization, onClose, onEdit, onDelete }: CreditNoteDetailPanelProps) {
  const [showPdfPreview, setShowPdfPreview] = useState(true);

  const handleDownloadPDF = async () => {
    const element = document.getElementById("pdf-content");
    if (!element) return;

    const originalStyle = element.style.cssText;
    element.style.backgroundColor = "#ffffff";
    element.style.color = "#000000";
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
            clonedElement.style.color = "#000000";

            const clonedAll = clonedDoc.querySelectorAll("*");
            clonedAll.forEach((el) => {
              const htmlEl = el as HTMLElement;

              const inlineStyle = htmlEl.getAttribute('style') || '';
              if (inlineStyle.includes('oklch')) {
                htmlEl.setAttribute('style', inlineStyle.replace(/oklch\([^)]+\)/g, 'inherit'));
              }

              const computed = window.getComputedStyle(htmlEl);

              const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke', 'stopColor', 'floodColor', 'lightingColor'];
              colorProps.forEach(prop => {
                const value = computed[prop as any];
                if (value && value.includes('oklch')) {
                  if (prop === 'color') htmlEl.style.setProperty('color', '#000000', 'important');
                  else if (prop === 'backgroundColor') htmlEl.style.setProperty('background-color', '#f3f4f6', 'important');
                  else if (prop === 'borderColor') htmlEl.style.setProperty('border-color', '#d1d5db', 'important');
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
      pdf.save(`CreditNote-${creditNote.creditNoteNumber}.pdf`);

      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "PDF Downloaded",
        description: `${creditNote.creditNoteNumber}.pdf has been downloaded successfully.`
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Failed to download PDF",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      element.style.cssText = originalStyle;
    }
  };

  const handlePrint = () => {
    const content = document.getElementById("pdf-content")?.innerHTML;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Credit Note ${creditNote.creditNoteNumber}</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              body { margin: 0; padding: 0; }
              #pdf-content { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="bg-white">
          <div id="pdf-content" class="w-full">
            ${content}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            }
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate" data-testid="text-credit-note-number">
            {creditNote.creditNoteNumber}
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto flex-wrap">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onEdit} data-testid="button-edit-credit-note">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-send-email">
          <Send className="h-3.5 w-3.5" />
          Email
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-blue-600"
          onClick={() => window.location.href = `/e-way-bills?creditNoteId=${creditNote.id}`}
          data-testid="button-add-eway-bill"
        >
          <FileText className="h-3.5 w-3.5" />
          Add e-Way Bill Details
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-pdf-print">
              <FileText className="h-3.5 w-3.5" />
              PDF/Print
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPDF}>
              <FileText className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-more-options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Clone</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-slate-100 dark:bg-slate-800 p-4">
          <div className="bg-white rounded-md shadow-sm p-2">
            <CreditNotePdfPreview creditNote={creditNote} branding={branding} organization={organization} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">More Information</h3>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
              <span>Salesperson</span>
              <span className="text-blue-600">{creditNote.salesperson || '-'}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Journal</h3>
          <p className="text-xs text-slate-500 mb-2">Amount is displayed in your base currency <Badge variant="secondary">INR</Badge></p>

          <h4 className="text-sm font-medium mb-2">Credit Note</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 font-medium text-slate-500">ACCOUNT</th>
                <th className="text-right py-2 font-medium text-slate-500">DEBIT</th>
                <th className="text-right py-2 font-medium text-slate-500">CREDIT</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-2">Accounts Receivable</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-2">Output SGST</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-2">Output CGST</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-2">Sales</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
              </tr>
              <tr className="font-medium">
                <td className="py-2"></td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
                <td className="text-right py-2">{formatCurrency(0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CreditNotes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [creditNotes, setCreditNotes] = useState<CreditNoteListItem[]>([]);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [creditNoteToDelete, setCreditNoteToDelete] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    fetchCreditNotes();
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

  const fetchCreditNotes = async () => {
    try {
      const response = await fetch('/api/credit-notes');
      const data = await response.json();
      if (data.success) {
        setCreditNotes(data.data);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch credit notes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreditNoteDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/credit-notes/${id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedCreditNote(data.data);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch credit note details", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!creditNoteToDelete) return;
    try {
      const response = await fetch(`/api/credit-notes/${creditNoteToDelete}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Credit note deleted successfully" });
        fetchCreditNotes();
        if (selectedCreditNote?.id === creditNoteToDelete) {
          setSelectedCreditNote(null);
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete credit note", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setCreditNoteToDelete(null);
    }
  };

  const filteredCreditNotes = creditNotes.filter(cn => {
    const matchesSearch =
      cn.creditNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cn.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "all") return matchesSearch;
    return matchesSearch && cn.status.toLowerCase() === activeFilter.toLowerCase();
  });

  const { currentPage, totalPages, totalItems, itemsPerPage, paginatedItems, goToPage } = usePagination(filteredCreditNotes, 10);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCreditNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCreditNotes.map(cn => cn.id)));
    }
  };

  return (
    <div className="h-full flex w-full overflow-hidden bg-slate-50">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full" autoSaveId="credit-notes-layout">
        <ResizablePanel
          defaultSize={selectedCreditNote ? 30 : 100}
          minSize={20}
          className="flex flex-col overflow-hidden bg-white"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 text-lg font-semibold" data-testid="dropdown-filter">
                      All Credit Notes
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setActiveFilter("all")}>All Credit Notes</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter("open")}>Open</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter("closed")}>Closed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveFilter("void")}>Void</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setLocation('/credit-notes/create')} className="gap-2" data-testid="button-new-credit-note">
                  <Plus className="h-4 w-4" /> New
                </Button>
                <Button variant="ghost" size="icon" data-testid="button-more-actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                    <th className="px-4 py-3 w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredCreditNotes.length && filteredCreditNotes.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Credit Note#</th>
                    <th className="px-4 py-3">Reference Number</th>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Invoice#</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 w-10">
                      <Search className="h-4 w-4 text-slate-400" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : filteredCreditNotes.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">No credit notes found</td>
                    </tr>
                  ) : (
                    paginatedItems.map((cn) => (
                      <tr
                        key={cn.id}
                        className={`hover-elevate cursor-pointer ${selectedCreditNote?.id === cn.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        onClick={() => fetchCreditNoteDetail(cn.id)}
                        data-testid={`row-credit-note-${cn.id}`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(cn.id)}
                            onCheckedChange={() => toggleSelect(cn.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(cn.date)}</td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium">{cn.creditNoteNumber}</td>
                        <td className="px-4 py-3 text-sm">{cn.referenceNumber || '-'}</td>
                        <td className="px-4 py-3 text-sm">{cn.customerName}</td>
                        <td className="px-4 py-3 text-sm">{cn.invoiceNumber || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge className={getStatusBadgeStyles(cn.status)}>
                            {cn.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(cn.total)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(cn.creditsRemaining)}</td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {filteredCreditNotes.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={goToPage}
                />
              )}
            </div>
          </div>
        </ResizablePanel>

        {selectedCreditNote && (
          <>
            <ResizableHandle withHandle className="w-1 bg-slate-200 hover:bg-blue-400 hover:w-1.5 transition-all cursor-col-resize" />
            <ResizablePanel defaultSize={70} minSize={30} className="bg-white">
              <div className="h-full flex flex-col overflow-hidden bg-white border-l border-slate-200 dark:border-slate-700">
                <CreditNoteDetailPanel
                  creditNote={selectedCreditNote}
                  branding={branding}
                  organization={currentOrganization}
                  onClose={() => setSelectedCreditNote(null)}
                  onEdit={() => setLocation(`/credit-notes/${selectedCreditNote.id}/edit`)}
                  onDelete={() => {
                    setCreditNoteToDelete(selectedCreditNote.id);
                    setDeleteDialogOpen(true);
                  }}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the credit note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
