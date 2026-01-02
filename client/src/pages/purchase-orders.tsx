import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Plus, Search, ChevronDown, MoreHorizontal, Pencil, Trash2,
  X, Mail, FileText, Printer, ArrowRight, Filter, Download,
  ClipboardList, Eye, Check, Calendar, XCircle, Copy, Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PurchasePDFHeader } from "@/components/purchase-pdf-header";
import { Organization } from "@shared/schema";
import { useOrganization } from "@/context/OrganizationContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  referenceNumber?: string;
  date: string;
  deliveryDate?: string;
  vendorId: string;
  vendorName: string;
  vendorAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    countryRegion?: string;
    gstin?: string;
  };
  items: Array<{
    id: string;
    itemName: string;
    description?: string;
    quantity: number;
    rate: number;
    tax?: string;
    taxAmount?: number;
    amount: number;
  }>;
  subTotal: number;
  discountAmount?: number;
  taxAmount?: number;
  adjustment?: number;
  total: number;
  notes?: string;
  termsAndConditions?: string;
  status: string;
  receiveStatus?: string;
  billedStatus?: string;
  createdAt?: string;
  pdfTemplate?: string;
}

interface ActionItem {
  icon: any;
  label: string;
  onClick: () => void;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function PurchaseOrderPDFView({ purchaseOrder, branding, organization }: { purchaseOrder: PurchaseOrder; branding?: any; organization?: Organization }) {
  const redThemeColor = '#b91c1c'; // Red-700
  const blueThemeColor = '#1d4ed8'; // Blue-700

  return (
    <div style={{ backgroundColor: 'white', padding: '40px', width: '100%', fontFamily: 'serif', color: '#1e293b' }} className="pdf-container">
      {/* Header Section with Organization Info */}
      <PurchasePDFHeader
        logo={branding?.logo}
        documentTitle="Purchase Order"
        documentNumber={purchaseOrder.purchaseOrderNumber || 'PO-00001'}
        date={purchaseOrder.date}
        referenceNumber={purchaseOrder.referenceNumber}
        organization={organization}
      />

      {/* Vendor Section */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px', fontWeight: 'normal' }}>Vendor Address</h4>
        <p style={{ fontSize: '12px', color: blueThemeColor, fontWeight: 'bold', margin: '0 0 2px 0', textTransform: 'uppercase' }}>{purchaseOrder.vendorName}</p>
        <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
          {purchaseOrder.vendorAddress?.street1 && <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress.street1}</p>}
          {purchaseOrder.vendorAddress?.city && <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress.city}</p>}
          <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress?.pinCode || '411057'}, {purchaseOrder.vendorAddress?.state || 'Maharashtra'}</p>
          <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress?.countryRegion || 'India'}</p>
          <p style={{ margin: 0 }}>GSTIN {purchaseOrder.vendorAddress?.gstin || '27AAMCC3732G1ZN'}</p>
        </div>
      </div>

      {/* Date/Ref Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '20px', fontSize: '11px' }}>
        <div style={{ display: 'flex', width: '150px', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ color: '#64748b' }}>Date :</span>
          <span>{formatDate(purchaseOrder.date)}</span>
        </div>
        <div style={{ display: 'flex', width: '150px', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Ref# :</span>
          <span>{purchaseOrder.referenceNumber || 'SO-00001'}</span>
        </div>
      </div>

      {/* Table Section */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: redThemeColor, color: 'white' }}>
            <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', width: '30px', fontWeight: 'bold' }}>#</th>
            <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>Item & Description</th>
            <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', width: '80px', fontWeight: 'bold' }}>HSN/SAC</th>
            <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', width: '60px', fontWeight: 'bold' }}>Qty</th>
            <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', width: '100px', fontWeight: 'bold' }}>Rate</th>
            <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', width: '100px', fontWeight: 'bold' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {purchaseOrder.items.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '15px 8px', textAlign: 'center', fontSize: '11px', verticalAlign: 'top' }}>{index + 1}</td>
              <td style={{ padding: '15px 8px', verticalAlign: 'top' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{item.itemName}</p>
                <p style={{ fontSize: '9px', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>{item.description}</p>
              </td>
              <td style={{ padding: '15px 8px', textAlign: 'center', fontSize: '11px', verticalAlign: 'top', color: '#64748b' }}>{(item as any).hsnSac || '998315'}</td>
              <td style={{ padding: '15px 8px', textAlign: 'center', fontSize: '11px', verticalAlign: 'top' }}>{item.quantity.toFixed(2)}</td>
              <td style={{ padding: '15px 8px', textAlign: 'right', fontSize: '11px', verticalAlign: 'top' }}>{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: '15px 8px', textAlign: 'right', fontSize: '11px', verticalAlign: 'top' }}>{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div style={{ width: '250px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
            <span style={{ color: '#64748b' }}>Sub Total</span>
            <span style={{ fontWeight: 'bold' }}>{purchaseOrder.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
            <span style={{ color: '#64748b' }}>CGST9 (9%)</span>
            <span style={{ fontWeight: 'bold' }}>{(purchaseOrder.taxAmount ? purchaseOrder.taxAmount / 2 : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
            <span style={{ color: '#64748b' }}>SGST9 (9%)</span>
            <span style={{ fontWeight: 'bold' }}>{(purchaseOrder.taxAmount ? purchaseOrder.taxAmount / 2 : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: redThemeColor, marginBottom: '15px' }}>
            <div style={{ textAlign: 'right', flex: 1, marginRight: '20px' }}>
              <p style={{ margin: 0 }}>Amount Withheld</p>
              <p style={{ margin: 0 }}>(Section 194 J)</p>
            </div>
            <span style={{ fontWeight: 'bold' }}>(-){(0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Total</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>₹{purchaseOrder.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div style={{ marginTop: '50px', textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', minHeight: '80px', minWidth: '200px' }}>
          {branding?.signature?.url ? (
            <img src={branding.signature.url} alt="Signature" style={{ maxWidth: '150px', maxHeight: '80px', objectFit: 'contain' }} />
          ) : (
            <div style={{ textAlign: 'center', color: '#1e293b', paddingTop: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, borderBottom: '1px solid #1e293b', paddingBottom: '2px', display: 'inline-block' }}>SKILLTONIT</p>
            </div>
          )}
        </div>
        <p style={{ fontSize: '12px', marginTop: '10px', color: '#64748b' }}>Authorized Signature</p>
      </div>
    </div>
  );
}

function PurchaseOrderDetailPanel({
  purchaseOrder,
  onClose,
  onEdit,
  onDelete,
  onConvertToBill,
  onMarkAsIssued,
  onMarkAsReceived,
  onMarkAsCancelled,
  onClone,
  onSetDeliveryDate,
  onCancelItems,
  branding,
  organization
}: {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvertToBill: () => void;
  onMarkAsIssued: () => void;
  onMarkAsReceived: () => void;
  onMarkAsCancelled: () => void;
  onClone: () => void;
  onSetDeliveryDate: () => void;
  onCancelItems: () => void;
  branding?: any;
  organization?: Organization;
}) {
  const [showPdfView, setShowPdfView] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    const toastResult = toast({ title: "Generating PDF...", description: "Please wait while we prepare your document." });
    try {
      const element = pdfRef.current;

      // Temporary style adjustments for PDF generation
      const originalStyle = element.getAttribute('style') || '';
      // Explicitly set non-OKLCH colors and hide problematic elements
      element.setAttribute('style', originalStyle + '; width: 800px !important; min-width: 800px !important; background-color: white !important; color: black !important;');

      // Inject CSS to override OKLCH colors during capture
      const styleTag = document.createElement('style');
      styleTag.id = 'pdf-capture-overrides';
      styleTag.innerHTML = `
        * { 
          color-scheme: light !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .pdf-container {
          background-color: white !important;
        }
        .pdf-container h1 { color: #b91c1c !important; }
        .pdf-container h2 { color: #b91c1c !important; }
        .pdf-container th { 
          background-color: #b91c1c !important; 
          color: white !important;
          -webkit-print-color-adjust: exact !important;
        }
        .pdf-container p[style*="color: rgb(29, 78, 216)"],
        .pdf-container p[style*="color: #1d4ed8"] {
          color: #1d4ed8 !important;
        }
        /* Reset any OKLCH variables commonly used in shadcn/tailwind */
        :root {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
          --primary: 221.2 83.2% 53.3%;
          --primary-foreground: 210 40% 98%;
        }
      `;
      document.head.appendChild(styleTag);

      // Ensure the element is visible during capture
      const isHidden = !showPdfView;
      if (isHidden) setShowPdfView(true);

      // Wait for state update and rendering
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 800,
        onclone: (clonedDoc) => {
          // Remove elements with OKLCH colors if still problematic
          const items = clonedDoc.querySelectorAll('*');
          items.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.backgroundColor.includes('oklch') || style.color.includes('oklch')) {
              (el as HTMLElement).style.setProperty('background-color', '#ffffff', 'important');
              (el as HTMLElement).style.setProperty('color', '#000000', 'important');
            }
          });
        }
      });

      // Cleanup
      document.getElementById('pdf-capture-overrides')?.remove();
      element.setAttribute('style', originalStyle);
      if (isHidden) setShowPdfView(false);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${purchaseOrder.purchaseOrderNumber}.pdf`);
      toastResult.update({ id: toastResult.id, title: "Success", description: "PDF downloaded successfully" });
    } catch (error) {
      console.error('Error generating PDF:', error);
      document.getElementById('pdf-capture-overrides')?.remove();
      toastResult.update({ id: toastResult.id, title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    if (!pdfRef.current) return;
    const printContent = pdfRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Purchase Order - ${purchaseOrder.purchaseOrderNumber}</title>
            <style>
              @media print {
                body { padding: 0; margin: 0; -webkit-print-color-adjust: exact; }
                .no-print { display: none; }
                @page { margin: 10mm; }
              }
              body { font-family: serif; padding: 20px; color: #1e293b; }
              p { margin: 0; }
              table { width: 100%; border-collapse: collapse; }
              .pdf-container { width: 100%; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  function getActionsForStatus(status: string): ActionItem[] {
    const actions: ActionItem[] = [];

    switch (status?.toUpperCase()) {
      case 'DRAFT':
        actions.push(
          { icon: Check, label: "Mark as Issued", onClick: onMarkAsIssued },
          { icon: ArrowRight, label: "Convert to Bill", onClick: onConvertToBill },
          { icon: Copy, label: "Clone", onClick: onClone },
          { icon: Trash2, label: "Delete", onClick: onDelete, className: "text-red-600" }
        );
        break;

      case 'ISSUED':
        actions.push(
          { icon: Calendar, label: "Expected Delivery Date", onClick: onSetDeliveryDate },
          { icon: XCircle, label: "Cancel Items", onClick: onCancelItems },
          { icon: XCircle, label: "Mark as Cancelled", onClick: onMarkAsCancelled },
          { icon: Copy, label: "Clone", onClick: onClone },
          { icon: Trash2, label: "Delete", onClick: onDelete, className: "text-red-600" },
          { icon: Check, label: "Mark as Received", onClick: onMarkAsReceived }
        );
        break;

      case 'RECEIVED':
        actions.push(
          { icon: ArrowRight, label: "Convert to Bill", onClick: onConvertToBill },
          { icon: Eye, label: "View", onClick: () => { } },
          { icon: FileText, label: "PDF/Print", onClick: () => { } },
          { icon: Copy, label: "Clone", onClick: onClone },
          { icon: Trash2, label: "Delete", onClick: onDelete, className: "text-red-600" }
        );
        break;

      case 'CLOSED':
        actions.push(
          { icon: Eye, label: "View", onClick: () => { } },
          { icon: FileText, label: "PDF/Print", onClick: () => { } },
          { icon: Copy, label: "Clone", onClick: onClone },
          { icon: Trash2, label: "Delete", onClick: onDelete, className: "text-red-600" }
        );
        break;

      default:
        actions.push(
          { icon: Trash2, label: "Delete", onClick: onDelete, className: "text-red-600" }
        );
    }

    return actions;
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900" data-testid="text-po-number">{purchaseOrder.purchaseOrderNumber}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPdfView(!showPdfView)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} data-testid="button-close-panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 overflow-x-auto bg-white">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onEdit} data-testid="button-edit-po">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Send Email
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              PDF/Print
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={onConvertToBill}
          data-testid="button-convert-to-bill"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Convert to Bill
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" data-testid="button-more-actions">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {getActionsForStatus(purchaseOrder.status).map((action: ActionItem, index: number) => (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                className={action.className || ""}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {purchaseOrder.billedStatus === 'YET TO BE BILLED' && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">WHAT'S NEXT?</span>
          <span className="text-sm text-slate-600">Convert this to a bill to complete your purchase.</span>
          <Button
            size="sm"
            className="ml-auto bg-blue-600 hover:bg-blue-700"
            onClick={onConvertToBill}
          >
            Convert to Bill
          </Button>
        </div>
      )}

      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="text-slate-500">Receive Status:</span>{' '}
            <span className={`${purchaseOrder.receiveStatus === 'RECEIVED' ? 'text-green-600' : 'text-amber-600'} font-medium`}>
              {purchaseOrder.receiveStatus || 'YET TO BE RECEIVED'}
            </span>
          </span>
          <span>
            <span className="text-slate-500">Bill Status:</span>{' '}
            <span className={`${purchaseOrder.billedStatus === 'BILLED' ? 'text-green-600' : 'text-amber-600'} font-medium`}>
              {purchaseOrder.billedStatus || 'YET TO BE BILLED'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="pdf-view" className="text-sm text-slate-500">Show PDF View</Label>
          <Switch id="pdf-view" checked={showPdfView} onCheckedChange={setShowPdfView} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div ref={pdfRef} className="w-full">
          {showPdfView ? (
            <div className="w-full">
              <PurchaseOrderPDFView purchaseOrder={purchaseOrder} branding={branding} />
            </div>
          ) : (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Vendor</span>
                  <p className="font-medium text-blue-600">{purchaseOrder.vendorName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Date</span>
                  <p className="font-medium">{formatDate(purchaseOrder.date)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Delivery Date</span>
                  <p className="font-medium">{formatDate(purchaseOrder.deliveryDate || '')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status</span>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    {purchaseOrder.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Item</th>
                      <th className="px-2 py-1 text-center">Qty</th>
                      <th className="px-2 py-1 text-right">Rate</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-2 py-2">{item.itemName}</td>
                        <td className="px-2 py-2 text-center">{item.quantity}</td>
                        <td className="px-2 py-2 text-right">{formatCurrency(item.rate)}</td>
                        <td className="px-2 py-2 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right space-y-1">
                <div className="flex justify-end gap-4 text-sm">
                  <span className="text-slate-500">Sub Total:</span>
                  <span className="w-28">{formatCurrency(purchaseOrder.subTotal)}</span>
                </div>
                <div className="flex justify-end gap-4 text-sm font-semibold">
                  <span>Total:</span>
                  <span className="w-28">{formatCurrency(purchaseOrder.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 p-3 text-center text-xs text-slate-500">
        PDF Template: <span className="text-blue-600">{purchaseOrder.pdfTemplate || 'Standard Template'}</span>
        <button className="text-blue-600 ml-2">Change</button>
      </div>
    </div>
  );
}

export default function PurchaseOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState<string | null>(null);
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);
  const [branding, setBranding] = useState<any>(null);

  // Use organization context instead of local state
  const { currentOrganization: organization } = useOrganization();

  useEffect(() => {
    fetchPurchaseOrders();
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

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/purchase-orders');
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPODetail = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPO(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch PO detail:', error);
    }
  };

  const handlePOClick = (po: PurchaseOrder) => {
    fetchPODetail(po.id);
  };

  const handleClosePanel = () => {
    setSelectedPO(null);
  };

  const handleEditPO = () => {
    if (selectedPO) {
      setLocation(`/purchase-orders/${selectedPO.id}/edit`);
    }
  };

  const handleDelete = (id: string) => {
    setPoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!poToDelete) return;
    try {
      const response = await fetch(`/api/purchase-orders/${poToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: "Purchase order deleted successfully" });
        fetchPurchaseOrders();
        if (selectedPO?.id === poToDelete) {
          handleClosePanel();
        }
      }
    } catch (error) {
      toast({ title: "Failed to delete purchase order", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setPoToDelete(null);
    }
  };

  const handleConvertToBill = async () => {
    if (!selectedPO) return;
    try {
      // First update the PO status
      const response = await fetch(`/api/purchase-orders/${selectedPO.id}/convert-to-bill`, {
        method: 'POST'
      });
      if (response.ok) {
        toast({ title: "Converting purchase order to bill..." });
        // Refresh PO list to update status before navigating
        await fetchPurchaseOrders();
        // Navigate to bill create with all PO data
        setLocation(`/bills/new?purchaseOrderId=${selectedPO.id}`);
      }
    } catch (error) {
      toast({ title: "Failed to convert to bill", variant: "destructive" });
    }
  };

  const handleMarkAsIssued = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ISSUED',
          updatedBy: 'Admin User'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with the updated PO from server
        setPurchaseOrders(prev =>
          prev.map(po =>
            po.id === poId ? data.data : po
          )
        );
        toast({ title: "Purchase Order Issued", description: "Status updated successfully" });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update purchase order status",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsReceived = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'RECEIVED',
          updatedBy: 'Admin User'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with the updated PO from server
        setPurchaseOrders(prev =>
          prev.map(po =>
            po.id === poId ? data.data : po
          )
        );
        // Also update selected PO if it's the one being received
        if (selectedPO?.id === poId) {
          setSelectedPO(data.data);
        }
        toast({ title: "Purchase Order Received", description: "Status updated successfully" });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update purchase order status",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsCancelled = async (poId: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CANCELLED',
          updatedBy: 'Admin User'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with the updated PO from server
        setPurchaseOrders(prev =>
          prev.map(po =>
            po.id === poId ? data.data : po
          )
        );
        toast({ title: "Purchase Order Cancelled", description: "Status updated successfully" });
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update purchase order status",
        variant: "destructive"
      });
    }
  };

  const handleClone = (poId: string) => {
    // Clone the purchase order
    const poToClone = purchaseOrders.find(po => po.id === poId);
    if (poToClone) {
      const clonedPO = {
        ...poToClone,
        id: Date.now().toString(),
        purchaseOrderNumber: `PO-${String(purchaseOrders.length + 1).padStart(5, '0')}`,
        date: new Date().toISOString().split('T')[0],
        status: 'DRAFT'
      };
      setPurchaseOrders(prev => [clonedPO, ...prev]);
      toast({ title: "Purchase Order Cloned", description: "Successfully created a copy" });
    }
  };

  const handleSetDeliveryDate = (poId: string) => {
    const newDate = prompt("Enter expected delivery date (YYYY-MM-DD):");
    if (newDate) {
      setPurchaseOrders(prev =>
        prev.map(po =>
          po.id === poId ? { ...po, deliveryDate: newDate } : po
        )
      );
      toast({ title: "Delivery Date Updated", description: "Expected delivery date set successfully" });
    }
  };

  const handleCancelItems = (poId: string) => {
    // Logic to cancel specific items in the PO
    toast({ title: "Cancel Items", description: "Item cancellation dialog would open here" });
  };

  const toggleSelectPO = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPOs.includes(id)) {
      setSelectedPOs(selectedPOs.filter(i => i !== id));
    } else {
      setSelectedPOs([...selectedPOs, id]);
    }
  };

  const filteredPOs = purchaseOrders.filter(po =>
    po.purchaseOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { currentPage, totalPages, totalItems, itemsPerPage, paginatedItems, goToPage } = usePagination(filteredPOs, 10);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ISSUED':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">ISSUED</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="text-slate-600 border-slate-200">DRAFT</Badge>;
      case 'CLOSED':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">CLOSED</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  function getActionsForStatus(status: string, poId: string) {
    const actions = [];

    switch (status?.toUpperCase()) {
      case 'DRAFT':
        actions.push(
          { icon: Check, label: "Mark as Issued", onClick: () => handleMarkAsIssued(poId) },
          { icon: ArrowRight, label: "Convert to Bill", onClick: () => handleConvertToBill() },
          { icon: Copy, label: "Clone", onClick: () => handleClone(poId) },
          { icon: Trash2, label: "Delete", onClick: () => handleDelete(poId), className: "text-red-600" }
        );
        break;

      case 'ISSUED':
        actions.push(
          { icon: Calendar, label: "Expected Delivery Date", onClick: () => handleSetDeliveryDate(poId) },
          { icon: XCircle, label: "Cancel Items", onClick: () => handleCancelItems(poId) },
          { icon: XCircle, label: "Mark as Cancelled", onClick: () => handleMarkAsCancelled(poId) },
          { icon: Copy, label: "Clone", onClick: () => handleClone(poId) },
          { icon: Trash2, label: "Delete", onClick: () => handleDelete(poId), className: "text-red-600" },
          { icon: Check, label: "Mark as Received", onClick: () => handleMarkAsReceived(poId) }
        );
        break;

      case 'RECEIVED':
      case 'CLOSED':
        actions.push(
          { icon: Eye, label: "View", onClick: () => handlePOClick(purchaseOrders.find(po => po.id === poId)!) },
          { icon: FileText, label: "PDF/Print", onClick: () => { } },
          { icon: Copy, label: "Clone", onClick: () => handleClone(poId) },
          { icon: Trash2, label: "Delete", onClick: () => handleDelete(poId), className: "text-red-600" }
        );
        break;

      case 'CANCELLED':
        actions.push(
          { icon: Copy, label: "Clone", onClick: () => handleClone(poId) },
          { icon: Trash2, label: "Delete", onClick: () => handleDelete(poId), className: "text-red-600" }
        );
        break;

      default:
        actions.push(
          { icon: Trash2, label: "Delete", onClick: () => handleDelete(poId), className: "text-red-600" }
        );
    }

    return actions;
  }

  return (
    <div className="flex h-[calc(100vh-80px)] animate-in fade-in duration-300 w-full overflow-hidden bg-slate-50">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full" autoSaveId="purchase-orders-layout">
        <ResizablePanel
          defaultSize={selectedPO ? 30 : 100}
          minSize={20}
          className="flex flex-col overflow-hidden bg-white"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">All Purchase Orders</h1>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setLocation("/purchase-orders/new")}
                  className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-9"
                  data-testid="button-new-po"
                >
                  <Plus className="h-4 w-4" /> New
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-more-options">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" /> Export
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={fetchPurchaseOrders}>
                      Refresh List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {!selectedPO && (
              <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-200 bg-white">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search purchase orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPOs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <ClipboardList className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No purchase orders yet</h3>
                  <p className="text-slate-500 mb-4 max-w-sm">
                    Create purchase orders to formalize orders with your vendors and track deliveries.
                  </p>
                  <Button
                    onClick={() => setLocation("/purchase-orders/new")}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-create-first-po"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create Your First Purchase Order
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                            <Checkbox 
                              checked={selectedPOs.length === paginatedItems.length && paginatedItems.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPOs(paginatedItems.map(po => po.id));
                                } else {
                                  setSelectedPOs([]);
                                }
                              }}
                              data-testid="checkbox-select-all" 
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Purchase Order#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reference#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Billed Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Delivery Date</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {paginatedItems.map((po) => (
                          <tr
                            key={po.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${selectedPO?.id === po.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => handlePOClick(po)}
                            data-testid={`row-po-${po.id}`}
                          >
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedPOs.includes(po.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPOs([...selectedPOs, po.id]);
                                  } else {
                                    setSelectedPOs(selectedPOs.filter(id => id !== po.id));
                                  }
                                }}
                                data-testid={`checkbox-po-${po.id}`}
                              />
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {formatDate(po.date)}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-blue-600 hover:underline">
                              {po.purchaseOrderNumber}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                              {po.referenceNumber || '-'}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-white">
                              {po.vendorName}
                            </td>
                            <td className="px-4 py-4">
                              {getStatusBadge(po.status)}
                            </td>
                            <td className="px-4 py-4 text-xs font-medium text-slate-500 uppercase tracking-tight">
                              {po.billedStatus || 'YET TO BE BILLED'}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-right text-slate-900 dark:text-white">
                              {formatCurrency(po.total)}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                              {formatDate(po.deliveryDate || '')}
                            </td>
                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover-elevate">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setLocation(`/purchase-orders/${po.id}/edit`)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => handleDelete(po.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {filteredPOs.length > 0 && (
                <div className="mt-4">
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={goToPage}
                  />
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        {selectedPO && (
          <>
            <ResizableHandle withHandle className="w-1 bg-slate-200 hover:bg-blue-400 hover:w-1.5 transition-all cursor-col-resize" />
            <ResizablePanel defaultSize={70} minSize={30} className="bg-white">
              <PurchaseOrderDetailPanel
                purchaseOrder={selectedPO}
                onClose={handleClosePanel}
                onEdit={handleEditPO}
                onDelete={() => handleDelete(selectedPO.id)}
                onConvertToBill={handleConvertToBill}
                onMarkAsIssued={() => handleMarkAsIssued(selectedPO.id)}
                onMarkAsReceived={() => handleMarkAsReceived(selectedPO.id)}
                onMarkAsCancelled={() => handleMarkAsCancelled(selectedPO.id)}
                onClone={() => handleClone(selectedPO.id)}
                onSetDeliveryDate={() => handleSetDeliveryDate(selectedPO.id)}
                onCancelItems={() => handleCancelItems(selectedPO.id)}
                branding={branding}
                organization={organization || undefined}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this purchase order? This action cannot be undone.
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
