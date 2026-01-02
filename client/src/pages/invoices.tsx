import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { jsPDF } from "jspdf";
import { addLogotoPDF, addSignaturetoPDF } from "@/lib/logo-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganization } from "@/context/OrganizationContext";
import { SalesPDFHeader } from "@/components/sales-pdf-header";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
    Plus,
    Download,
    Send,
    MoreHorizontal,
    Trash2,
    Pencil,
    MessageSquare,
    CreditCard,
    HelpCircle,
    Mail,
    Printer,
    Copy,
    X,
    Menu,
    Search,
    Filter,
    ChevronDown,
    CheckCircle,
    Clock,
    AlertCircle,
    Share2,
    FileText,
    Repeat,
    FileCheck,
    Truck,
    Ban,
    BookOpen,
    Settings,
    RotateCcw
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";

interface InvoiceListItem {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerId: string;
    date: string;
    dueDate: string;
    amount: number;
    status: string;
    terms: string;
    balanceDue: number;
}

interface InvoiceDetail {
    id: string;
    invoiceNumber: string;
    referenceNumber: string;
    date: string;
    dueDate: string;
    customerId: string;
    customerName: string;
    billingAddress: {
        street: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
    };
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
    };
    salesperson: string;
    placeOfSupply: string;
    paymentTerms: string;
    items: any[];
    subTotal: number;
    shippingCharges: number;
    cgst: number;
    sgst: number;
    igst: number;
    adjustment: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    customerNotes: string;
    termsAndConditions: string;
    status: string;
    sourceType: string | null;
    sourceNumber: string | null;
    payments: any[];
    activityLogs: any[];
    createdAt: string;
    amountRefunded?: number;
    refunds?: any[];
}

const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const formatAddress = (address: any) => {
    if (!address) return ['-'];
    const parts = [address.street, address.city, address.state, address.country, address.pincode].filter(Boolean);
    return parts.length > 0 ? parts : ['-'];
};

const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
        case 'PAID':
            return 'bg-green-100 text-green-700 border-green-200';
        case 'PENDING':
            return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'OVERDUE':
            return 'bg-red-100 text-red-700 border-red-200';
        case 'DRAFT':
            return 'bg-slate-100 text-slate-600 border-slate-200';
        case 'SENT':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'PARTIALLY_PAID':
            return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default:
            return 'bg-slate-100 text-slate-600 border-slate-200';
    }
};

const getActivityIcon = (action: string) => {
    switch (action) {
        case 'created':
            return <div className="w-3 h-3 rounded-full bg-green-500" />;
        case 'sent':
            return <div className="w-3 h-3 rounded-full bg-blue-500" />;
        case 'paid':
            return <div className="w-3 h-3 rounded-full bg-green-500" />;
        case 'payment_recorded':
            return <div className="w-3 h-3 rounded-full bg-emerald-500" />;
        case 'updated':
            return <div className="w-3 h-3 rounded-full bg-yellow-500" />;
        default:
            return <div className="w-3 h-3 rounded-full bg-slate-400" />;
    }
};

export default function Invoices() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("whats-next");
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMode, setPaymentMode] = useState("cash");
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentTime, setPaymentTime] = useState(new Date().toTimeString().slice(0, 5));
    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
    const [journalDialogOpen, setJournalDialogOpen] = useState(false);
    const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
    const [refundDialogOpen, setRefundDialogOpen] = useState(false);
    const [refundAmount, setRefundAmount] = useState("");
    const [refundMode, setRefundMode] = useState("Cash");
    const [refundReason, setRefundReason] = useState("");
    const [branding, setBranding] = useState<any>(null);
    const invoicePdfRef = useRef<HTMLDivElement>(null);
    const { currentOrganization } = useOrganization();

    useEffect(() => {
        fetchInvoices();
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

    const fetchInvoices = async () => {
        try {
            const response = await fetch('/api/invoices');
            if (response.ok) {
                const data = await response.json();
                setInvoices(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoiceDetail = async (id: string) => {
        try {
            const response = await fetch(`/api/invoices/${id}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedInvoice(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch invoice detail:', error);
        }
    };

    const handleInvoiceClick = (invoice: InvoiceListItem) => {
        fetchInvoiceDetail(invoice.id);
    };

    const handleClosePanel = () => {
        setSelectedInvoice(null);
    };

    const handleEditInvoice = () => {
        if (selectedInvoice) {
            setLocation(`/invoices/${selectedInvoice.id}/edit`);
        }
    };

    const toggleSelectInvoice = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedInvoices.includes(id)) {
            setSelectedInvoices(selectedInvoices.filter(i => i !== id));
        } else {
            setSelectedInvoices([...selectedInvoices, id]);
        }
    };

    const handleDownloadPDF = async (invoice: InvoiceDetail) => {
        const doc = new jsPDF();

        // Add organization logo and signature
        await addLogotoPDF(doc, { maxWidth: 40, maxHeight: 40, x: 14, y: 12 });
        await addSignaturetoPDF(doc, { maxWidth: 40, maxHeight: 20, x: 14, y: 250 });

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("INVOICE", 190, 30, { align: "right" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`# ${invoice.invoiceNumber}`, 190, 38, { align: "right" });
        doc.text(`Balance Due`, 190, 48, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(invoice.balanceDue), 190, 56, { align: "right" });

        // Company info from organization
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(currentOrganization?.name || "Your Company", 20, 30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        if (currentOrganization?.street1) {
            doc.text(currentOrganization.street1, 20, 38);
        }
        if (currentOrganization?.street2) {
            doc.text(currentOrganization.street2, 20, 44);
        }
        if (currentOrganization?.city) {
            doc.text(`${currentOrganization.city}, ${currentOrganization.state || ''} ${currentOrganization.postalCode || ''}`, 20, 50);
        }
        if (currentOrganization?.email) {
            doc.text(currentOrganization.email, 20, 56);
        }
        if (currentOrganization?.gstin) {
            doc.text(`GSTIN: ${currentOrganization.gstin}`, 20, 62);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("BILL TO", 20, 70);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(invoice.customerName, 20, 78);
        const billAddress = formatAddress(invoice.billingAddress);
        billAddress.forEach((line, i) => {
            doc.text(line, 20, 84 + (i * 5));
        });

        doc.text(`Invoice Date: ${formatDate(invoice.date)}`, 120, 78);
        doc.text(`Terms: ${invoice.paymentTerms}`, 120, 84);
        doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 120, 90);

        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(20, 110, 190, 110);

        doc.setFont("helvetica", "bold");
        doc.text("#", 20, 118);
        doc.text("Item", 30, 118);
        doc.text("Qty", 100, 118);
        doc.text("Rate", 130, 118);
        doc.text("Amount", 190, 118, { align: "right" });

        doc.line(20, 122, 190, 122);

        let yPos = 130;
        doc.setFont("helvetica", "normal");
        invoice.items.forEach((item, index) => {
            doc.text(String(index + 1), 20, yPos);
            doc.text(item.name || 'Item', 30, yPos);
            doc.text(String(item.quantity || 1), 100, yPos);
            doc.text(formatCurrency(item.rate || 0), 130, yPos);
            doc.text(formatCurrency(item.amount || 0), 190, yPos, { align: "right" });
            yPos += 8;
        });

        yPos += 10;
        doc.line(120, yPos, 190, yPos);
        yPos += 8;

        doc.text("Sub Total", 120, yPos);
        doc.text(formatCurrency(invoice.subTotal), 190, yPos, { align: "right" });
        yPos += 8;

        if (invoice.cgst > 0) {
            doc.text("CGST", 120, yPos);
            doc.text(formatCurrency(invoice.cgst), 190, yPos, { align: "right" });
            yPos += 8;
        }
        if (invoice.sgst > 0) {
            doc.text("SGST", 120, yPos);
            doc.text(formatCurrency(invoice.sgst), 190, yPos, { align: "right" });
            yPos += 8;
        }

        doc.setFont("helvetica", "bold");
        doc.text("Total", 120, yPos);
        doc.text(formatCurrency(invoice.total), 190, yPos, { align: "right" });
        yPos += 8;

        if (invoice.amountPaid > 0) {
            doc.setFont("helvetica", "normal");
            doc.text("Payment Made", 120, yPos);
            doc.text(`(-) ${formatCurrency(invoice.amountPaid)}`, 190, yPos, { align: "right" });
            yPos += 8;
        }

        doc.setFont("helvetica", "bold");
        doc.text("Balance Due", 120, yPos);
        doc.text(formatCurrency(invoice.balanceDue), 190, yPos, { align: "right" });

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 280, { align: "center" });

        doc.save(`${invoice.invoiceNumber}.pdf`);

        toast({
            title: "PDF Downloaded",
            description: `${invoice.invoiceNumber}.pdf has been downloaded successfully.`,
        });
    };

    const handleSendInvoice = async () => {
        if (!selectedInvoice) return;
        try {
            const response = await fetch(`/api/invoices/${selectedInvoice.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SENT' })
            });
            if (response.ok) {
                toast({ title: "Invoice marked as sent" });
                fetchInvoiceDetail(selectedInvoice.id);
                fetchInvoices();
            }
        } catch (error) {
            toast({ title: "Failed to send invoice", variant: "destructive" });
        }
    };

    const handleRecordPayment = async () => {
        if (!selectedInvoice || !paymentAmount) return;
        try {
            // Combine date and time into a single timestamp
            const paymentDateTime = new Date(`${paymentDate}T${paymentTime}`);

            const response = await fetch(`/api/invoices/${selectedInvoice.id}/record-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(paymentAmount),
                    paymentMode: paymentMode,
                    date: paymentDateTime.toISOString()
                })
            });
            if (response.ok) {
                toast({ title: "Payment recorded successfully" });
                setPaymentDialogOpen(false);
                setPaymentAmount("");
                setPaymentDate(new Date().toISOString().split('T')[0]);
                setPaymentTime(new Date().toTimeString().slice(0, 5));
                fetchInvoiceDetail(selectedInvoice.id);
                fetchInvoices();
            }
        } catch (error) {
            toast({ title: "Failed to record payment", variant: "destructive" });
        }
    };

    const getRefundableAmount = () => {
        if (!selectedInvoice) return 0;
        return selectedInvoice.amountPaid || 0;
    };

    const handleRefund = async () => {
        if (!selectedInvoice || !refundAmount) return;
        const amount = parseFloat(refundAmount);
        const refundableAmount = getRefundableAmount();
        if (amount <= 0) {
            toast({ title: "Refund amount must be greater than 0", variant: "destructive" });
            return;
        }
        if (amount > refundableAmount) {
            toast({ title: `Refund amount cannot exceed refundable balance of ${formatCurrency(refundableAmount)}`, variant: "destructive" });
            return;
        }
        try {
            const response = await fetch(`/api/invoices/${selectedInvoice.id}/refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount,
                    mode: refundMode,
                    reason: refundReason || 'Refund processed'
                })
            });
            if (response.ok) {
                toast({ title: "Refund processed successfully" });
                setRefundDialogOpen(false);
                setRefundAmount("");
                setRefundReason("");
                fetchInvoiceDetail(selectedInvoice.id);
                fetchInvoices();
            } else {
                const errorData = await response.json();
                toast({ title: errorData.message || "Failed to process refund", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Failed to process refund", variant: "destructive" });
        }
    };

    const handleDeleteClick = () => {
        if (selectedInvoice) {
            setInvoiceToDelete(selectedInvoice.id);
            setDeleteDialogOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            const response = await fetch(`/api/invoices/${invoiceToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                toast({ title: "Invoice deleted successfully" });
                handleClosePanel();
                fetchInvoices();
            }
        } catch (error) {
            toast({ title: "Failed to delete invoice", variant: "destructive" });
        } finally {
            setDeleteDialogOpen(false);
            setInvoiceToDelete(null);
        }
    };

    const handleMarkAsSent = async () => {
        if (!selectedInvoice) return;
        try {
            const response = await fetch(`/api/invoices/${selectedInvoice.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'SENT' })
            });
            if (response.ok) {
                toast({ title: "Invoice marked as sent" });
                fetchInvoiceDetail(selectedInvoice.id);
                fetchInvoices();
            }
        } catch (error) {
            toast({ title: "Failed to mark invoice as sent", variant: "destructive" });
        }
    };

    const handleMakeRecurring = () => {
        setRecurringDialogOpen(true);
    };

    const handleCreateCreditNote = () => {
        if (selectedInvoice) {
            setLocation(`/credit-notes/create?fromInvoice=${selectedInvoice.id}`);
        }
    };

    const handleAddEWayBillDetails = () => {
        if (selectedInvoice) {
            setLocation(`/e-way-bills?fromInvoice=${selectedInvoice.id}`);
        }
    };

    const handleCloneInvoice = () => {
        if (selectedInvoice) {
            setLocation(`/invoices/new?cloneFrom=${selectedInvoice.id}`);
        }
    };

    const handleVoidInvoice = async () => {
        if (!selectedInvoice) return;
        try {
            const response = await fetch(`/api/invoices/${selectedInvoice.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VOID' })
            });
            if (response.ok) {
                toast({ title: "Invoice voided successfully" });
                setVoidDialogOpen(false);
                fetchInvoiceDetail(selectedInvoice.id);
                fetchInvoices();
            }
        } catch (error) {
            toast({ title: "Failed to void invoice", variant: "destructive" });
        }
    };

    const handleViewJournal = () => {
        setJournalDialogOpen(true);
    };

    const handleInvoicePreferences = () => {
        setPreferencesDialogOpen(true);
    };

    const handleShare = () => {
        if (selectedInvoice) {
            navigator.clipboard.writeText(`${window.location.origin}/invoices/${selectedInvoice.id}`);
            toast({ title: "Link copied to clipboard" });
        }
    };

    const [showPdfPreview, setShowPdfPreview] = useState(false);

    const handlePrint = () => {
        const printContent = document.getElementById('invoice-pdf-content');
        if (printContent) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Invoice - ${selectedInvoice?.invoiceNumber}</title>
                            <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                                    background-color: white; 
                                    display: flex;
                                    justify-content: center;
                                    padding: 20mm;
                                }
                                #invoice-pdf-content {
                                    width: 210mm;
                                    min-height: 297mm;
                                    background: white;
                                    padding: 0;
                                }
                                .p-12 { padding: 3rem; }
                                .mb-8 { margin-bottom: 2rem; }
                                .mb-6 { margin-bottom: 1.5rem; }
                                .mb-4 { margin-bottom: 1rem; }
                                .mb-3 { margin-bottom: 0.75rem; }
                                .mb-2 { margin-bottom: 0.5rem; }
                                .mb-1 { margin-bottom: 0.25rem; }
                                .mt-2 { margin-top: 0.5rem; }
                                .mt-4 { margin-top: 1rem; }
                                .pb-4 { padding-bottom: 1rem; }
                                .pt-6 { padding-top: 1.5rem; }
                                .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                                .px-4 { padding-left: 1rem; padding-right: 1rem; }
                                .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                                .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
                                .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
                                .p-3 { padding: 0.75rem; }
                                .p-4 { padding: 1rem; }
                                .flex { display: flex; }
                                .justify-between { justify-content: space-between; }
                                .items-start { align-items: flex-start; }
                                .grid { display: grid; }
                                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                                .gap-12 { gap: 3rem; }
                                .space-y-0-5 > * + * { margin-top: 0.125rem; }
                                .space-y-3 > * + * { margin-top: 0.75rem; }
                                .flex-1 { flex: 1 1 0%; }
                                .text-right { text-align: right; }
                                .text-center { text-align: center; }
                                .text-xs { font-size: 0.75rem; line-height: 1rem; }
                                .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                                .text-base { font-size: 1rem; line-height: 1.5rem; }
                                .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                                .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
                                .text-2xl { font-size: 1.5rem; line-height: 2rem; }
                                .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
                                .font-bold { font-weight: 700; }
                                .font-semibold { font-weight: 600; }
                                .font-medium { font-weight: 500; }
                                .uppercase { text-transform: uppercase; }
                                .tracking-wide { letter-spacing: 0.025em; }
                                .text-slate-500 { color: #64748b; }
                                .text-slate-600 { color: #475569; }
                                .text-slate-700 { color: #334155; }
                                .text-slate-900 { color: #0f172a; }
                                .text-blue-600 { color: #2563eb; }
                                .text-green-600 { color: #16a34a; }
                                .bg-slate-50 { background-color: #f8fafc; }
                                .bg-slate-100 { background-color: #f1f5f9; }
                                .border { border: 1px solid #e2e8f0; }
                                .border-b { border-bottom: 1px solid #e2e8f0; }
                                .border-y-2 { border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; }
                                .border-t { border-top: 1px solid #e2e8f0; }
                                .border-t-2 { border-top: 2px solid #cbd5e1; }
                                .border-slate-100 { border-color: #f1f5f9; }
                                .border-slate-200 { border-color: #e2e8f0; }
                                .border-slate-300 { border-color: #cbd5e1; }
                                .rounded { border-radius: 0.25rem; }
                                .rounded-lg { border-radius: 0.5rem; }
                                .w-96 { width: 24rem; }
                                .leading-relaxed { line-height: 1.625; }
                                table { width: 100%; border-collapse: collapse; }
                                th { 
                                    padding: 0.75rem; 
                                    text-align: left; 
                                    font-size: 0.75rem;
                                    font-weight: 700;
                                    color: #334155;
                                    text-transform: uppercase;
                                    letter-spacing: 0.05em;
                                }
                                td { 
                                    padding: 1rem 0.75rem; 
                                    font-size: 0.875rem;
                                }
                                @page {
                                    size: A4;
                                    margin: 0;
                                }
                                @media print {
                                    body { 
                                        padding: 0;
                                        margin: 0;
                                    }
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
            setShowPdfPreview(true);
            setTimeout(handlePrint, 100);
        }
    };

    const handleDownloadPDFLocal = async () => {
        if (!selectedInvoice) return;

        // Check if PDF preview is already shown
        const pdfElement = document.getElementById('invoice-pdf-content');

        if (!pdfElement) {
            // If PDF preview is not shown, show it first and wait
            setShowPdfPreview(true);
            setTimeout(handleDownloadPDFLocal, 300);
            return;
        }

        try {
            // Import the unified PDF utility
            const { generatePDFFromElement } = await import("@/lib/pdf-utils");

            // Generate PDF from the existing PDF view
            await generatePDFFromElement("invoice-pdf-content", `Invoice-${selectedInvoice.invoiceNumber}.pdf`);

            toast({
                title: "PDF Downloaded",
                description: `Invoice ${selectedInvoice.invoiceNumber} has been downloaded successfully.`
            });
        } catch (error) {
            console.error("PDF generation error:", error);
            toast({
                title: "Failed to download PDF",
                description: "Please try again.",
                variant: "destructive"
            });
        }
    };

    const filteredInvoices = invoices.filter(invoice =>
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { currentPage, totalPages, totalItems, itemsPerPage, paginatedItems, goToPage } = usePagination(filteredInvoices, 10);

    const getCalculatedStatus = (invoice: InvoiceListItem) => {
        if (invoice.status === 'PAID') return { label: 'PAID', color: 'text-green-700', bgColor: 'bg-green-100' };
        if (invoice.status === 'DRAFT') return { label: 'DRAFT', color: 'text-slate-600', bgColor: 'bg-slate-100' };
        if (invoice.status === 'PARTIALLY_PAID') return { label: 'PARTIALLY PAID', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: 'OVERDUE', color: 'text-red-700', bgColor: 'bg-red-100' };
        if (diffDays === 0) return { label: 'DUE TODAY', color: 'text-orange-700', bgColor: 'bg-orange-100' };
        return { label: 'PENDING', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    };

    return (
        <div className="flex h-[calc(100vh-80px)] animate-in fade-in duration-300 w-full overflow-hidden bg-slate-50">
            <ResizablePanelGroup direction="horizontal" className="h-full w-full" autoSaveId="invoices-layout">
                <ResizablePanel
                    defaultSize={selectedInvoice ? 30 : 100}
                    minSize={20}
                    className="flex flex-col overflow-hidden bg-white"
                >
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold text-slate-900">All Invoices</h1>
                                <span className="text-sm text-slate-400">({invoices.length})</span>
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href="/invoices/new">
                                    <Button className="bg-red-500 hover:bg-red-600 gap-1.5 h-9" data-testid="button-new-invoice">
                                        <Plus className="h-4 w-4" /> New
                                    </Button>
                                </Link>
                                <Button variant="outline" size="icon" className="h-9 w-9">
                                    <Menu className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {!selectedInvoice && (
                            <div className="px-4 pb-3 flex items-center gap-2 border-b border-slate-200 bg-white">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search invoices..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9"
                                        data-testid="input-search-invoices"
                                    />
                                </div>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Filter className="h-4 w-4" />
                                    Filter
                                </Button>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto border-t border-slate-200">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">Loading invoices...</div>
                            ) : filteredInvoices.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <p>No invoices found.</p>
                                    <Link href="/invoices/new">
                                        <Button className="mt-4 bg-red-500 hover:bg-red-600">
                                            <Plus className="h-4 w-4 mr-2" /> Create your first invoice
                                        </Button>
                                    </Link>
                                </div>
                            ) : selectedInvoice ? (
                                <div className="divide-y divide-slate-100">
                                    {filteredInvoices.map((invoice) => {
                                        const status = getCalculatedStatus(invoice);
                                        return (
                                            <div
                                                key={invoice.id}
                                                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${selectedInvoice?.id === invoice.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                                                    }`}
                                                onClick={() => handleInvoiceClick(invoice)}
                                                data-testid={`card-invoice-${invoice.id}`}
                                            >
                                                <div className="flex items-start justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            checked={selectedInvoices.includes(invoice.id)}
                                                            onClick={(e) => toggleSelectInvoice(invoice.id, e)}
                                                        />
                                                        <span className="font-medium text-slate-900 truncate">{invoice.customerName}</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900">
                                                        {formatCurrency(invoice.amount)}
                                                    </span>
                                                </div>
                                                <div className="ml-6 flex items-center gap-2 text-sm">
                                                    <span className="text-blue-600">{invoice.invoiceNumber}</span>
                                                    <span className="text-slate-400">{formatDate(invoice.date)}</span>
                                                </div>
                                                <div className="ml-6 mt-1">
                                                    <Badge className={`text-[10px] px-1.5 py-0 border-0 uppercase ${status.bgColor} ${status.color}`}>
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <>
                                    <table className="w-full">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="w-12 px-4 py-3">
                                                    <Checkbox />
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice#</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Balance Due</th>
                                                <th className="w-10 px-4 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedItems.map((invoice) => {
                                                const status = getCalculatedStatus(invoice);
                                                return (
                                                    <tr
                                                        key={invoice.id}
                                                        className="hover:bg-slate-50 cursor-pointer"
                                                        onClick={() => handleInvoiceClick(invoice)}
                                                        data-testid={`row-invoice-${invoice.id}`}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <Checkbox
                                                                checked={selectedInvoices.includes(invoice.id)}
                                                                onClick={(e) => toggleSelectInvoice(invoice.id, e)}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {formatDate(invoice.date)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-sm text-blue-600 hover:underline">
                                                                {invoice.invoiceNumber}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                                                            {invoice.customerName}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge className={`text-[10px] uppercase ${status.bgColor} ${status.color}`}>
                                                                {status.label}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {formatDate(invoice.dueDate)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                                                            {formatCurrency(invoice.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-900 text-right font-medium">
                                                            {formatCurrency(invoice.balanceDue)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/${invoice.id}/edit`); }}>Edit</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/invoices/create?cloneFrom=${invoice.id}`); }}>Clone</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Send</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-red-600">Delete</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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

                {selectedInvoice && (
                    <>
                        <ResizableHandle withHandle className="w-1 bg-slate-200 hover:bg-blue-400 hover:w-1.5 transition-all cursor-col-resize" />
                        <ResizablePanel defaultSize={70} minSize={30} className="bg-white">
                            <div className="flex flex-col h-full overflow-hidden bg-white border-l border-slate-200">
                                <div className="flex items-center justify-between p-3 border-b border-slate-200 sticky top-0 bg-white z-10">
                                    <div className="flex items-center gap-4">
                                        <Button variant="ghost" size="icon" onClick={handleClosePanel} className="h-8 w-8">
                                            <X className="h-4 w-4" />
                                        </Button>
                                        <div className="flex flex-col">
                                            <h2 className="text-sm font-semibold text-slate-900">{selectedInvoice.invoiceNumber}</h2>
                                            <span className="text-xs text-slate-500">{selectedInvoice.customerName}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">Show PDF View</span>
                                            <Switch checked={showPdfPreview} onCheckedChange={setShowPdfPreview} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-200 overflow-x-auto bg-white dark:bg-slate-900">
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleEditInvoice} data-testid="button-edit-invoice">
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 gap-1.5" data-testid="button-send-dropdown">
                                                <Mail className="h-3.5 w-3.5" />
                                                Send
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={handleSendInvoice}>Send Email</DropdownMenuItem>
                                            <DropdownMenuItem>Send WhatsApp</DropdownMenuItem>
                                            <DropdownMenuItem>Send SMS</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleShare} data-testid="button-share-invoice">
                                        <Share2 className="h-3.5 w-3.5" />
                                        Share
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 gap-1.5" data-testid="button-pdf-print">
                                                <FileText className="h-3.5 w-3.5" />
                                                PDF/Print
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={handleDownloadPDFLocal}>
                                                <Download className="mr-2 h-4 w-4" /> Download PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handlePrint}>
                                                <Printer className="mr-2 h-4 w-4" /> Print
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setPaymentDialogOpen(true)} data-testid="button-record-payment">
                                        <CreditCard className="h-3.5 w-3.5" />
                                        Record Payment
                                    </Button>
                                    {(selectedInvoice?.amountPaid || 0) > 0 && (
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => {
                                            setRefundAmount("");
                                            setRefundReason("");
                                            setRefundDialogOpen(true);
                                        }} data-testid="button-refund">
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Refund
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8" data-testid="button-more-actions">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuItem onClick={handleMarkAsSent} data-testid="menu-mark-as-sent">
                                                <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                                                <span className="text-blue-600 font-medium">Mark As Sent</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleMakeRecurring} data-testid="menu-make-recurring">
                                                <Repeat className="mr-2 h-4 w-4" /> Make Recurring
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleCreateCreditNote} data-testid="menu-create-credit-note">
                                                <FileCheck className="mr-2 h-4 w-4" /> Create Credit Note
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleAddEWayBillDetails} data-testid="menu-add-eway-bill">
                                                <Truck className="mr-2 h-4 w-4" /> Add e-Way Bill Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleCloneInvoice} data-testid="menu-clone">
                                                <Copy className="mr-2 h-4 w-4" /> Clone
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setVoidDialogOpen(true)} data-testid="menu-void">
                                                <Ban className="mr-2 h-4 w-4" /> Void
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleViewJournal} data-testid="menu-view-journal">
                                                <BookOpen className="mr-2 h-4 w-4" /> View Journal
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={handleDeleteClick}
                                                data-testid="menu-delete-invoice"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={handleInvoicePreferences} data-testid="menu-invoice-preferences">
                                                <Settings className="mr-2 h-4 w-4" /> Invoice Preferences
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {showPdfPreview ? (
                                    <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-800 p-8">
                                        <div className="max-w-4xl mx-auto shadow-lg bg-white dark:bg-white">
                                            <div id="invoice-pdf-content" ref={invoicePdfRef} className="bg-white" style={{ width: '210mm', minHeight: '297mm', border: '1px solid #cbd5e1' }}>
                                                <div className="p-12 text-black">
                                                    {/* Standard Sales PDF Header */}
                                                    <div className="mb-8">
                                                        <SalesPDFHeader
                                                            logo={branding?.logo || undefined}
                                                            documentTitle="Invoice"
                                                            documentNumber={selectedInvoice.invoiceNumber}
                                                            date={selectedInvoice.date}
                                                            referenceNumber={selectedInvoice.referenceNumber}
                                                            organization={currentOrganization || undefined}
                                                        />
                                                    </div>

                                                    {/* Status and Balance Due */}
                                                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
                                                        <Badge className={`${getStatusColor(selectedInvoice.status)} px-3 py-1`}>
                                                            {selectedInvoice.status}
                                                        </Badge>
                                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                                                            <p className="text-xs text-slate-500 mb-1">Balance Due</p>
                                                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedInvoice.balanceDue)}</p>
                                                        </div>
                                                    </div>

                                                    {/* Bill To and Invoice Details */}
                                                    <div className="grid grid-cols-2 gap-12 mb-8">
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wide">BILL TO</p>
                                                            <p className="font-bold text-blue-600 mb-2 text-base">{selectedInvoice.customerName}</p>
                                                            <div className="text-sm text-slate-700 space-y-0.5">
                                                                {formatAddress(selectedInvoice.billingAddress).map((line, i) => (
                                                                    <p key={i}>{line}</p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm">
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                                                    <span className="text-slate-600 font-medium">Invoice Date</span>
                                                                    <span className="font-semibold text-slate-900">{formatDate(selectedInvoice.date)}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                                                    <span className="text-slate-600 font-medium">Terms</span>
                                                                    <span className="font-semibold text-slate-900">{selectedInvoice.paymentTerms || 'Due on Receipt'}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                                                    <span className="text-slate-600 font-medium">Due Date</span>
                                                                    <span className="font-semibold text-slate-900">{formatDate(selectedInvoice.dueDate)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Items Table */}
                                                    <div className="mb-8">
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr className="bg-slate-100 border-y-2 border-slate-300">
                                                                    <th className="py-3 px-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">#</th>
                                                                    <th className="py-3 px-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">ITEM & DESCRIPTION</th>
                                                                    <th className="py-3 px-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wide">QTY</th>
                                                                    <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wide">RATE</th>
                                                                    <th className="py-3 px-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wide">AMOUNT</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(selectedInvoice.items || []).map((item: any, index: number) => (
                                                                    <tr key={item.id || index} className="border-b border-slate-200">
                                                                        <td className="py-4 px-3 text-sm text-slate-900">{index + 1}</td>
                                                                        <td className="py-4 px-3">
                                                                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                                                            {item.description && (
                                                                                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-4 px-3 text-sm text-center text-slate-900">{item.quantity}</td>
                                                                        <td className="py-4 px-3 text-sm text-right text-slate-900">{formatCurrency(item.rate)}</td>
                                                                        <td className="py-4 px-3 text-sm text-right font-semibold text-slate-900">{formatCurrency(item.amount)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Totals Section */}
                                                    <div className="flex justify-end mb-8">
                                                        <div className="w-96 border border-slate-200 rounded-lg overflow-hidden">
                                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                                                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Summary</p>
                                                            </div>
                                                            <div className="p-4 space-y-3 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-600">Sub Total</span>
                                                                    <span className="font-semibold text-slate-900">{formatCurrency(selectedInvoice.subTotal || selectedInvoice.total)}</span>
                                                                </div>
                                                                {selectedInvoice.cgst > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-600">CGST</span>
                                                                        <span className="font-semibold text-slate-900">{formatCurrency(selectedInvoice.cgst)}</span>
                                                                    </div>
                                                                )}
                                                                {selectedInvoice.sgst > 0 && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-600">SGST</span>
                                                                        <span className="font-semibold text-slate-900">{formatCurrency(selectedInvoice.sgst)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between py-3 border-t-2 border-slate-300 text-base font-bold">
                                                                    <span className="text-slate-900">Total</span>
                                                                    <span className="text-slate-900">{formatCurrency(selectedInvoice.total)}</span>
                                                                </div>
                                                                {selectedInvoice.amountPaid > 0 && (
                                                                    <div className="flex justify-between text-green-600">
                                                                        <span className="font-medium">Payment Made</span>
                                                                        <span className="font-semibold">(-) {formatCurrency(selectedInvoice.amountPaid)}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between py-3 border-t-2 border-slate-300 text-lg font-bold">
                                                                    <span className="text-slate-900">Balance Due</span>
                                                                    <span className="text-slate-900">{formatCurrency(selectedInvoice.balanceDue)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Notes Section */}
                                                    {selectedInvoice.customerNotes && (
                                                        <div className="mt-8 pt-6 border-t-2 border-slate-200">
                                                            <p className="text-xs text-slate-500 uppercase font-bold mb-3 tracking-wide">NOTES</p>
                                                            <p className="text-sm text-slate-700 leading-relaxed">{selectedInvoice.customerNotes}</p>
                                                        </div>
                                                    )}

                                                    {/* Signature Section */}
                                                    {branding?.signature?.url && (
                                                        <div className="mt-12 flex justify-end">
                                                            <div className="text-center">
                                                                <img src={branding.signature.url} alt="Authorized Signature" className="h-16 w-auto mb-2" />
                                                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide border-t border-slate-200 pt-2">Authorized Signature</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-auto">
                                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                            <div className="px-6 bg-white border-b border-slate-200">
                                                <TabsList className="h-auto p-0 bg-transparent gap-4">
                                                    <TabsTrigger
                                                        value="whats-next"
                                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-0 py-3"
                                                    >
                                                        <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                                                        What's Next
                                                    </TabsTrigger>
                                                    <TabsTrigger
                                                        value="comments"
                                                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-0 py-3"
                                                    >
                                                        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                                        Comments & History
                                                    </TabsTrigger>
                                                    {/* Payments tab removed - merged into Comments & History */}
                                                </TabsList>
                                            </div>

                                            <ScrollArea className="flex-1">
                                                <TabsContent value="whats-next" className="m-0 p-6">
                                                    <div className="bg-purple-50 rounded-lg border border-purple-100 p-4 flex items-start gap-4 mb-6">
                                                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                            <Send className="h-5 w-5 text-purple-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-slate-900">Send the Invoice</h4>
                                                            <p className="text-sm text-slate-600 mt-1">
                                                                Invoice has been created. You can now email this invoice to your customer or mark it as sent.
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-3">
                                                                <Button variant="outline" size="sm" onClick={handleSendInvoice}>
                                                                    Mark as Sent
                                                                </Button>
                                                                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                                                                    <Send className="h-3.5 w-3.5" /> Send Invoice
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="bg-white rounded-lg border border-slate-200 p-6">
                                                            <div className="flex items-start justify-between mb-6">
                                                                <div>
                                                                    {branding?.logo?.url ? (
                                                                        <img src={branding.logo.url} alt="Company Logo" className="h-16 w-auto" data-testid="img-invoice-logo" />
                                                                    ) : (
                                                                        <div className="h-16 w-16 bg-slate-200 rounded flex items-center justify-center">
                                                                            <span className="text-xs text-slate-500">No Logo</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <Badge className={getStatusColor(selectedInvoice.status)}>
                                                                        {selectedInvoice.status}
                                                                    </Badge>
                                                                    <h2 className="text-2xl font-bold text-blue-600 mt-2">INVOICE</h2>
                                                                    <p className="text-sm text-slate-500"># {selectedInvoice.invoiceNumber}</p>
                                                                    <p className="text-sm text-slate-500 mt-2">Balance Due</p>
                                                                    <p className="text-xl font-bold text-slate-900">{formatCurrency(selectedInvoice.balanceDue)}</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-8 py-4 border-y border-slate-200">
                                                                <div>
                                                                    <p className="text-xs text-slate-500 uppercase mb-1">Bill To</p>
                                                                    <p className="font-medium text-blue-600">{selectedInvoice.customerName}</p>
                                                                    {formatAddress(selectedInvoice.billingAddress).map((line, i) => (
                                                                        <p key={i} className="text-sm text-slate-600">{line}</p>
                                                                    ))}
                                                                </div>
                                                                <div className="text-sm space-y-1">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-500">Invoice Date</span>
                                                                        <span>{formatDate(selectedInvoice.date)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-500">Terms</span>
                                                                        <span>{selectedInvoice.paymentTerms}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-500">Due Date</span>
                                                                        <span>{formatDate(selectedInvoice.dueDate)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <table className="w-full mt-4">
                                                                <thead>
                                                                    <tr className="border-b border-slate-200">
                                                                        <th className="py-2 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                                                                        <th className="py-2 text-left text-xs font-medium text-slate-500 uppercase">Item & Description</th>
                                                                        <th className="py-2 text-center text-xs font-medium text-slate-500 uppercase">Qty</th>
                                                                        <th className="py-2 text-right text-xs font-medium text-slate-500 uppercase">Rate</th>
                                                                        <th className="py-2 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(selectedInvoice.items || []).map((item, index) => (
                                                                        <tr key={item.id || index} className="border-b border-slate-100">
                                                                            <td className="py-3 text-sm">{index + 1}</td>
                                                                            <td className="py-3">
                                                                                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                                                                {item.description && (
                                                                                    <p className="text-xs text-slate-500">{item.description}</p>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-3 text-sm text-center">{item.quantity}</td>
                                                                            <td className="py-3 text-sm text-right">{formatCurrency(item.rate)}</td>
                                                                            <td className="py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>

                                                            <div className="mt-4 flex justify-end">
                                                                <div className="w-64 space-y-2 text-sm">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-500">Sub Total</span>
                                                                        <span>{formatCurrency(selectedInvoice.subTotal)}</span>
                                                                    </div>
                                                                    {selectedInvoice.cgst > 0 && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-500">CGST</span>
                                                                            <span>{formatCurrency(selectedInvoice.cgst)}</span>
                                                                        </div>
                                                                    )}
                                                                    {selectedInvoice.sgst > 0 && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-slate-500">SGST</span>
                                                                            <span>{formatCurrency(selectedInvoice.sgst)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between pt-2 border-t border-slate-200 font-medium">
                                                                        <span>Total</span>
                                                                        <span>{formatCurrency(selectedInvoice.total)}</span>
                                                                    </div>
                                                                    {(selectedInvoice.amountPaid > 0 || (selectedInvoice.amountRefunded || 0) > 0) && (
                                                                        <div className="flex justify-between text-green-600">
                                                                            <span>Payment Made</span>
                                                                            <span>(-) {formatCurrency((selectedInvoice.amountPaid || 0) + (selectedInvoice.amountRefunded || 0))}</span>
                                                                        </div>
                                                                    )}
                                                                    {(selectedInvoice.amountRefunded || 0) > 0 && (
                                                                        <div className="flex justify-between text-orange-600">
                                                                            <span>Refunded</span>
                                                                            <span>(+) {formatCurrency(selectedInvoice.amountRefunded || 0)}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base">
                                                                        <span>Balance Due</span>
                                                                        <span>{formatCurrency(selectedInvoice.balanceDue)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {selectedInvoice.customerNotes && (
                                                                <div className="mt-6 pt-4 border-t border-slate-200">
                                                                    <p className="text-xs text-slate-500 uppercase mb-1">Notes</p>
                                                                    <p className="text-sm text-slate-600">{selectedInvoice.customerNotes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="comments" className="m-0 p-6">
                                                    <div className="space-y-6">
                                                        {/* Payment History Section */}
                                                        {(selectedInvoice.payments || []).length > 0 && (
                                                            <div>
                                                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment History</h3>
                                                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                    <table className="w-full">
                                                                        <thead className="bg-slate-50">
                                                                            <tr>
                                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">System Activity</th>
                                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Payment Mode</th>
                                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actual Payment Date & Time</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-200">
                                                                            {(selectedInvoice.payments || []).map((payment: any) => (
                                                                                <tr key={payment.id} className="hover:bg-slate-50">
                                                                                    <td className="px-4 py-3 text-sm text-slate-900">
                                                                                        Payment of {formatCurrency(payment.amount)} recorded
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-sm text-slate-900">
                                                                                        {payment.paymentMode?.toUpperCase() || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-sm text-slate-900">
                                                                                        {formatDateTime(payment.date || payment.timestamp)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Refund History Section */}
                                                        {(selectedInvoice.refunds || []).length > 0 && (
                                                            <div className="mt-6">
                                                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Refund History</h3>
                                                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                                    <table className="w-full">
                                                                        <thead className="bg-orange-50">
                                                                            <tr>
                                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Refund Details</th>
                                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Mode</th>
                                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-200">
                                                                            {(selectedInvoice.refunds || []).map((refund: any) => (
                                                                                <tr key={refund.id} className="hover:bg-slate-50">
                                                                                    <td className="px-4 py-3 text-sm text-orange-700">
                                                                                        Refund of {formatCurrency(refund.amount)} processed
                                                                                        {refund.reason && <span className="text-slate-500 ml-1">- {refund.reason}</span>}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-sm text-slate-900">
                                                                                        {refund.mode?.toUpperCase() || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-sm text-slate-900">
                                                                                        {formatDateTime(refund.date)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TabsContent>

                                                {/* Payments tab removed - content merged into Comments & History */}
                                            </ScrollArea>
                                        </Tabs>
                                    </div>
                                )}

                                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete this invoice? This action cannot be undone.
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

                                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Record Payment</DialogTitle>
                                            <DialogDescription>
                                                Record a payment for {selectedInvoice?.invoiceNumber}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Amount Received</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    data-testid="input-payment-amount"
                                                />
                                                <p className="text-xs text-slate-500">
                                                    Balance Due: {formatCurrency(selectedInvoice?.balanceDue || 0)}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Payment Mode</Label>
                                                <Select value={paymentMode} onValueChange={setPaymentMode}>
                                                    <SelectTrigger data-testid="select-payment-mode">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                        <SelectItem value="cheque">Cheque</SelectItem>
                                                        <SelectItem value="upi">UPI</SelectItem>
                                                        <SelectItem value="credit_card">Credit Card</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Payment Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={paymentDate}
                                                        onChange={(e) => setPaymentDate(e.target.value)}
                                                        data-testid="input-payment-date"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Payment Time</Label>
                                                    <Input
                                                        type="time"
                                                        value={paymentTime}
                                                        onChange={(e) => setPaymentTime(e.target.value)}
                                                        data-testid="input-payment-time"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={handleRecordPayment} data-testid="button-confirm-payment">Record Payment</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Process Refund</DialogTitle>
                                            <DialogDescription>
                                                Process a refund for {selectedInvoice?.invoiceNumber}. Refundable balance: {formatCurrency(getRefundableAmount())}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Refund Amount</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Enter refund amount"
                                                    value={refundAmount}
                                                    onChange={(e) => setRefundAmount(e.target.value)}
                                                    max={getRefundableAmount()}
                                                    data-testid="input-refund-amount"
                                                />
                                                <p className="text-xs text-muted-foreground">Maximum refundable: {formatCurrency(getRefundableAmount())}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Refund Mode</Label>
                                                <Select value={refundMode} onValueChange={setRefundMode}>
                                                    <SelectTrigger data-testid="select-refund-mode">
                                                        <SelectValue placeholder="Select refund mode" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Cash">Cash</SelectItem>
                                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                                        <SelectItem value="UPI">UPI</SelectItem>
                                                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Reason (Optional)</Label>
                                                <Input
                                                    placeholder="Enter reason for refund"
                                                    value={refundReason}
                                                    onChange={(e) => setRefundReason(e.target.value)}
                                                    data-testid="input-refund-reason"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={handleRefund} data-testid="button-confirm-refund">Process Refund</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Void Invoice</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to void this invoice ({selectedInvoice?.invoiceNumber})? This action will mark the invoice as void and it cannot be used for transactions.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleVoidInvoice} className="bg-orange-600 hover:bg-orange-700">
                                                Void Invoice
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Make Recurring Invoice</DialogTitle>
                                            <DialogDescription>
                                                Set up this invoice to automatically generate on a schedule.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Profile Name</Label>
                                                <Input placeholder="Monthly Invoice" data-testid="input-recurring-name" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Repeat Every</Label>
                                                <div className="flex gap-2">
                                                    <Input type="number" defaultValue="1" className="w-20" />
                                                    <Select defaultValue="month">
                                                        <SelectTrigger className="flex-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="week">Week(s)</SelectItem>
                                                            <SelectItem value="month">Month(s)</SelectItem>
                                                            <SelectItem value="year">Year(s)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Start Date</Label>
                                                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End</Label>
                                                <Select defaultValue="never">
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="never">Never</SelectItem>
                                                        <SelectItem value="after">After # of occurrences</SelectItem>
                                                        <SelectItem value="on">On a specific date</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setRecurringDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={() => {
                                                toast({ title: "Recurring invoice created" });
                                                setRecurringDialogOpen(false);
                                            }}>Create Recurring Invoice</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Journal Entry</DialogTitle>
                                            <DialogDescription>
                                                View the accounting journal entry for {selectedInvoice?.invoiceNumber}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Account</th>
                                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Debit</th>
                                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Credit</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200">
                                                        <tr>
                                                            <td className="px-4 py-3 text-sm text-slate-900">Accounts Receivable</td>
                                                            <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatCurrency(selectedInvoice?.total || 0)}</td>
                                                            <td className="px-4 py-3 text-sm text-slate-900 text-right">-</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-4 py-3 text-sm text-slate-900">Sales Revenue</td>
                                                            <td className="px-4 py-3 text-sm text-slate-900 text-right">-</td>
                                                            <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatCurrency(selectedInvoice?.subTotal || 0)}</td>
                                                        </tr>
                                                        {(selectedInvoice?.cgst || 0) > 0 && (
                                                            <tr>
                                                                <td className="px-4 py-3 text-sm text-slate-900">CGST Payable</td>
                                                                <td className="px-4 py-3 text-sm text-slate-900 text-right">-</td>
                                                                <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatCurrency(selectedInvoice?.cgst || 0)}</td>
                                                            </tr>
                                                        )}
                                                        {(selectedInvoice?.sgst || 0) > 0 && (
                                                            <tr>
                                                                <td className="px-4 py-3 text-sm text-slate-900">SGST Payable</td>
                                                                <td className="px-4 py-3 text-sm text-slate-900 text-right">-</td>
                                                                <td className="px-4 py-3 text-sm text-slate-900 text-right">{formatCurrency(selectedInvoice?.sgst || 0)}</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50">
                                                        <tr>
                                                            <td className="px-4 py-3 text-sm font-medium text-slate-900">Total</td>
                                                            <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(selectedInvoice?.total || 0)}</td>
                                                            <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(selectedInvoice?.total || 0)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={() => setJournalDialogOpen(false)}>Close</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={preferencesDialogOpen} onOpenChange={setPreferencesDialogOpen}>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Invoice Preferences</DialogTitle>
                                            <DialogDescription>
                                                Customize the settings for your invoices.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Default Payment Terms</Label>
                                                <Select defaultValue="net30">
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                                                        <SelectItem value="net15">Net 15</SelectItem>
                                                        <SelectItem value="net30">Net 30</SelectItem>
                                                        <SelectItem value="net45">Net 45</SelectItem>
                                                        <SelectItem value="net60">Net 60</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Invoice Number Prefix</Label>
                                                <Input defaultValue="INV-" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Default Notes</Label>
                                                <Input placeholder="Thank you for your business!" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Default Terms & Conditions</Label>
                                                <Input placeholder="Payment is due within the terms specified..." />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setPreferencesDialogOpen(false)}>Cancel</Button>
                                            <Button onClick={() => {
                                                toast({ title: "Invoice preferences saved" });
                                                setPreferencesDialogOpen(false);
                                            }}>Save Preferences</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                            </div>
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>
        </div>
    );
}

