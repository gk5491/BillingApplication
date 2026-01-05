import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useOrganization } from "@/context/OrganizationContext";
import { useBranding } from "@/hooks/use-branding";
import {
  Plus, Search, ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2,
  X, Copy, Ban, FileText, ArrowUpDown, Download, Upload,
  Settings, RefreshCw, Building2, Bold, Italic, Underline,
  Printer, Calendar, Link2, Clock, User, Filter, Send, Mail,
  Receipt, CreditCard, Wallet, BookOpen, Package, Paperclip
} from "lucide-react";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/table-pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface Vendor {
  id: string;
  salutation?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  displayName: string;
  email?: string;
  workPhone?: string;
  mobile?: string;
  gstTreatment?: string;
  sourceOfSupply?: string;
  pan?: string;
  msmeRegistered?: boolean;
  currency?: string;
  openingBalance?: number;
  paymentTerms?: string;
  tds?: string;
  payables?: number;
  unusedCredits?: number;
  status?: string;
  attachments?: Attachment[];
  billingAddress?: {
    attention?: string;
    countryRegion?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    phone?: string;
    faxNumber?: string;
  };
  shippingAddress?: {
    attention?: string;
    countryRegion?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    phone?: string;
    faxNumber?: string;
  };
  contactPersons?: Array<{
    salutation?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    workPhone?: string;
    mobile?: string;
  }>;
  bankDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    swiftCode?: string;
    branchName?: string;
  };
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  date: string;
  number: string;
  orderNumber?: string;
  vendor?: string;
  paidThrough?: string;
  amount: number;
  balance: number;
  status: string;
  referenceNumber?: string;
  customer?: string;
  invoiceNumber?: string;
}

interface SystemMail {
  id: string;
  to: string;
  subject: string;
  description: string;
  sentAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  user: string;
  date: string;
  time: string;
}

const formatAddress = (address: any) => {
  if (!address) return ['-'];
  const parts = [address.street1, address.street2, address.city, address.state, address.pinCode, address.countryRegion].filter(Boolean);
  return parts.length > 0 ? parts : ['-'];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

function VendorDetailPanel({
  vendor,
  onClose,
  onEdit,
  onClone,
  onToggleStatus,
  onDelete
}: {
  vendor: Vendor;
  onClose: () => void;
  onEdit: () => void;
  onClone: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const { currentOrganization: currentOrg } = useOrganization();
  const { data: branding } = useBranding();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({
    bills: [],
    billPayments: [],
    expenses: [],
    purchaseOrders: [],
    vendorCredits: [],
    journals: []
  });
  const [mails, setMails] = useState<SystemMail[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    bills: true,
    billPayments: true,
    expenses: true,
    purchaseOrders: false,
    vendorCredits: false,
    journals: false
  });

  const [statementPeriod, setStatementPeriod] = useState("this-month");
  const [statementFilter, setStatementFilter] = useState("all");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState(vendor.email || "");

  useEffect(() => {
    fetchVendorData();
  }, [vendor.id]);

  const fetchVendorData = async () => {
    try {
      const [commentsRes, transactionsRes, mailsRes, activitiesRes] = await Promise.all([
        fetch(`/api/vendors/${vendor.id}/comments`),
        fetch(`/api/vendors/${vendor.id}/transactions`),
        fetch(`/api/vendors/${vendor.id}/mails`),
        fetch(`/api/vendors/${vendor.id}/activities`)
      ]);

      if (commentsRes.ok) {
        const data = await commentsRes.json();
        setComments(data.data || []);
      }
      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.data || transactions);
      }
      if (mailsRes.ok) {
        const data = await mailsRes.json();
        setMails(data.data || []);
      }
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment })
      });
      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.data]);
        setNewComment("");
        toast({ title: "Comment added successfully" });
      }
    } catch (error) {
      toast({ title: "Failed to add comment", variant: "destructive" });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 10;

      // Title
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`Vendor Statement - ${vendor.displayName || ''}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Date Range
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('From 01/12/2025 To 31/12/2025', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // Company Header (Two columns)
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(currentOrg?.name || 'SkilltonIT', 20, yPos);

      // Vendor info on right side
      const vendorInfoX = 120;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(currentOrg?.name || 'SkilltonIT', vendorInfoX, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.text(currentOrg?.street1 || 'Hinjewadi - Wakad road', vendorInfoX, yPos);
      yPos += 5;
      doc.text(currentOrg?.street2 || 'Hinjewadi', vendorInfoX, yPos);
      yPos += 5;
      doc.text(`${currentOrg?.city || 'Pune'} ${currentOrg?.state || 'Maharashtra'} ${currentOrg?.postalCode || '411057'}`, vendorInfoX, yPos);
      yPos += 5;
      doc.text(currentOrg?.location || 'India', vendorInfoX, yPos);
      yPos += 5;
      doc.text(`GSTIN ${currentOrg?.gstin || '27AZCPA5145K1ZH'}`, vendorInfoX, yPos);
      yPos += 5;
      doc.text(currentOrg?.email || 'Sales.SkilltonIT@skilltonit.com', vendorInfoX, yPos);
      yPos += 5;
      doc.text(currentOrg?.website || 'www.skilltonit.com', vendorInfoX, yPos);
      yPos += 10;

      // "To:" Section
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text('To', 20, yPos);
      yPos += 6;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(vendor.displayName || '', 20, yPos);
      yPos += 5;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      if (vendor.companyName) {
        doc.text(vendor.companyName, 20, yPos);
        yPos += 5;
      }

      // Address details
      if (vendor.billingAddress?.street1) {
        doc.text(vendor.billingAddress.street1, 20, yPos);
        yPos += 5;
      }
      if (vendor.billingAddress?.street2) {
        doc.text(vendor.billingAddress.street2, 20, yPos);
        yPos += 5;
      }
      if (vendor.billingAddress?.city) {
        doc.text(vendor.billingAddress.city, 20, yPos);
        yPos += 5;
      }
      if (vendor.pan) {
        doc.text(`PAN ${vendor.pan}`, 20, yPos);
        yPos += 5;
      }
      yPos += 5;

      // Account Summary Section
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Account Summary', 20, yPos);
      yPos += 8;

      // Summary Table
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      const summaryRows = [
        ['Opening Balance', formatCurrency(vendor.openingBalance || 0)],
        ['Billed Amount', formatCurrency(billedAmount)],
        ['Amount Paid', formatCurrency(amountPaid)],
        ['Balance Due', formatCurrency(balanceDue)]
      ];

      const leftCol = 30;
      const rightCol = pageWidth - 30;

      summaryRows.forEach(([label, value]) => {
        doc.text(label || '', leftCol, yPos);
        doc.text(value || '', rightCol, yPos, { align: 'right' });
        yPos += 6;
      });

      yPos += 8;

      // Transactions Table Header
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Date', 20, yPos);
      doc.text('Transactions', 40, yPos);
      doc.text('Details', 80, yPos);
      doc.text('Amount', 120, yPos, { align: 'right' });
      doc.text('Payments', 150, yPos, { align: 'right' });
      doc.text('Balance', pageWidth - 20, yPos, { align: 'right' });
      yPos += 5;

      // Draw line under header
      doc.setDrawColor(200);
      doc.line(20, yPos - 1, pageWidth - 20, yPos - 1);
      yPos += 3;

      // Opening Balance Row
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('01/12/2025', 20, yPos);
      doc.text('***Opening Balance***', 40, yPos);
      doc.text(String((vendor.openingBalance || 0).toFixed(2)), 120, yPos, { align: 'right' });
      doc.text(String((vendor.openingBalance || 0).toFixed(2)), pageWidth - 20, yPos, { align: 'right' });

      doc.save(`vendor-statement-${vendor.displayName}.pdf`);
      toast({ title: "Statement downloaded as PDF" });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "Failed to download PDF", variant: "destructive" });
    }
  };

  const handleDownloadWord = () => {
    try {
      const content = `
VENDOR STATEMENT
${vendor.displayName}

Date Range: 01/12/2025 To 31/12/2025

From: SkilltonIT
To: ${vendor.displayName}
${vendor.companyName ? `Company: ${vendor.companyName}` : ''}

ACCOUNT SUMMARY
Opening Balance: ${formatCurrency(vendor.openingBalance || 0)}
Billed Amount: ${formatCurrency(0)}
Amount Paid: ${formatCurrency(0)}
Balance Due: ${formatCurrency(vendor.payables || 0)}

Generated on ${new Date().toLocaleDateString('en-IN')}`;

      const blob = new Blob([content], { type: 'application/msword' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vendor-statement-${vendor.displayName}.doc`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Statement downloaded as Word document" });
    } catch (error) {
      toast({ title: "Failed to download Word document", variant: "destructive" });
    }
  };

  const handleSendEmail = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/mails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: `Vendor Statement - ${vendor.displayName}`,
          description: `Please find attached the vendor statement for ${vendor.displayName} from 01/12/2025 to 31/12/2025.`
        })
      });
      if (response.ok) {
        toast({ title: "Statement sent via email" });
        setShowEmailDialog(false);
        setEmailTo(vendor.email || "");
        fetchVendorData();
      } else {
        toast({ title: "Failed to send email", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to send email", variant: "destructive" });
    }
  };

  const handleNewTransaction = (type: string) => {
    const availableRoutes: Record<string, string> = {
      bill: `/bills/new?vendorId=${vendor.id}`,
      bills: `/bills/new?vendorId=${vendor.id}`,
      expense: `/expenses?vendorId=${vendor.id}`,
      expenses: `/expenses?vendorId=${vendor.id}`,
      purchaseOrder: `/purchase-orders/new?vendorId=${vendor.id}`,
      purchaseOrders: `/purchase-orders/new?vendorId=${vendor.id}`,
      billPayment: `/payments-made/new?vendorId=${vendor.id}`,
      billPayments: `/payments-made/new?vendorId=${vendor.id}`,
      vendorCredit: `/vendor-credits/new?vendorId=${vendor.id}`,
      vendorCredits: `/vendor-credits/new?vendorId=${vendor.id}`,
    };
    const unavailableTypes = ["journal", "journals"];

    if (unavailableTypes.includes(type)) {
      toast({
        title: "Feature coming soon",
        description: "This feature is not yet available. Please check back later.",
      });
      return;
    }
    setLocation(availableRoutes[type] || `/bills/new?vendorId=${vendor.id}`);
  };

  const transactionSections = [
    { key: 'bills', label: 'Bills', columns: ['DATE', 'BILL#', 'ORDER ...', 'VENDOR', 'AMOUNT', 'BALANC...', 'STATUS'] },
    { key: 'billPayments', label: 'Bill Payments', columns: ['DATE', 'PAYMEN...', 'REFERE...', 'PAYMEN...', 'AMOUN...', 'UNUSED...', 'STATUS'] },
    { key: 'expenses', label: 'Expenses', columns: ['DATE', 'EXPE...', 'INVOI...', 'VEND...', 'PAID T...', 'CUST...', 'AMOU...', 'STATUS'] },
    { key: 'purchaseOrders', label: 'Purchase Orders', columns: ['PURCHAS...', 'REFEREN...', 'DATE', 'DELIVERY D...', 'AMOUNT', 'STATUS'] },
    { key: 'vendorCredits', label: 'Vendor Credits', columns: ['DATE', 'CREDIT NO...', 'ORDER NU...', 'BALANCE', 'AMOUNT', 'STATUS'] },
    { key: 'journals', label: 'Journals', columns: ['DATE', 'JOURNAL NU...', 'REFERENCE NU...', 'DEBIT', 'CREDIT'] }
  ];

  const [statementTransactions, setStatementTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (activeTab === "statement") {
      fetchStatementTransactions();
    }
  }, [activeTab, vendor.id]);

  const fetchStatementTransactions = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/transactions`);
      if (response.ok) {
        const data = await response.json();
        const allTx = [
          ...(data.data.bills || []).map((bill: any) => ({ ...bill, type: 'Bill' })),
          ...(data.data.billPayments || []).map((pay: any) => ({ ...pay, type: 'Payment' })),
          ...(data.data.expenses || []).map((exp: any) => ({ ...exp, type: 'Expense' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setStatementTransactions(allTx);
      }
    } catch (error) {
      console.error('Error fetching statement transactions:', error);
    }
  };

  const billedAmount = statementTransactions
    .filter(tx => tx.type === 'Bill' || tx.type === 'Expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const amountPaid = statementTransactions
    .filter(tx => tx.type === 'Payment' || tx.status === 'PAID')
    .reduce((sum, tx) => {
      if (tx.type === 'Payment') return sum + tx.amount;
      return sum + (tx.amount - (tx.balance || 0));
    }, 0);

  const balanceDue = (vendor.openingBalance || 0) + billedAmount - amountPaid;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white truncate" data-testid="text-vendor-name">{vendor.displayName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} data-testid="button-edit-vendor">
            Edit
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <FileText className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-1.5" size="sm" data-testid="button-new-transaction">
                New Transaction
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-slate-500">PURCHASES</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleNewTransaction("bill")} data-testid="menu-item-bill">
                <Receipt className="mr-2 h-4 w-4" /> Bill
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewTransaction("billPayment")} data-testid="menu-item-bill-payment">
                <CreditCard className="mr-2 h-4 w-4" /> Bill Payment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewTransaction("purchaseOrder")} data-testid="menu-item-purchase-order">
                <Package className="mr-2 h-4 w-4" /> Purchase Order
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNewTransaction("expense")} data-testid="menu-item-expense">
                <Wallet className="mr-2 h-4 w-4" /> Expense
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewTransaction("vendorCredit")} data-testid="menu-item-vendor-credit">
                <CreditCard className="mr-2 h-4 w-4" /> Vendor Credit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewTransaction("journal")} data-testid="menu-item-journal">
                <BookOpen className="mr-2 h-4 w-4" /> Journal
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
              <DropdownMenuItem onClick={onClone} data-testid="menu-item-clone">
                <Copy className="mr-2 h-4 w-4" />
                Clone Vendor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStatus} data-testid="menu-item-toggle-status">
                <Ban className="mr-2 h-4 w-4" />
                {vendor.status === 'active' ? 'Mark as Inactive' : 'Mark as Active'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={onDelete} data-testid="menu-item-delete">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} data-testid="button-close-panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              data-testid="tab-overview"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="comments"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              data-testid="tab-comments"
            >
              Comments
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              data-testid="tab-transactions"
            >
              Transactions
            </TabsTrigger>
            <TabsTrigger
              value="mails"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              data-testid="tab-mails"
            >
              Mails
            </TabsTrigger>
            <TabsTrigger
              value="statement"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-4 py-3"
              data-testid="tab-statement"
            >
              Statement
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-auto mt-0">
          <div className="flex h-full">
            <div className="w-72 border-r border-slate-200 dark:border-slate-700 p-6 overflow-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{vendor.displayName}</h3>
                  {vendor.companyName && (
                    <p className="text-sm text-slate-500 mt-1">{vendor.companyName}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{vendor.firstName} {vendor.lastName}</p>
                      {vendor.email && <p className="text-xs text-blue-600">{vendor.email}</p>}
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 mt-2">Invite to Portal</button>
                </div>

                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-slate-500">
                    ADDRESS
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">Billing Address</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm mt-1">
                        {formatAddress(vendor.billingAddress).map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">Shipping Address</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-sm mt-1">
                        {formatAddress(vendor.shippingAddress).map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>
                    <button className="text-sm text-blue-600">Add additional address</button>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-slate-500">
                    OTHER DETAILS
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="text-slate-500">Vendor Type</p>
                      <p className="font-medium">Business</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Default Currency</p>
                      <p className="font-medium">{vendor.currency || 'INR'}</p>
                    </div>
                    {vendor.gstTreatment && (
                      <div>
                        <p className="text-slate-500">GST Treatment</p>
                        <p className="font-medium">{vendor.gstTreatment}</p>
                      </div>
                    )}
                    {vendor.pan && (
                      <div>
                        <p className="text-slate-500">PAN</p>
                        <p className="font-medium">{vendor.pan}</p>
                      </div>
                    )}
                    {vendor.sourceOfSupply && (
                      <div>
                        <p className="text-slate-500">Source of Supply</p>
                        <p className="font-medium">{vendor.sourceOfSupply}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-500">Payment Terms</p>
                      <p className="font-medium">{vendor.paymentTerms || 'Due on Receipt'}</p>
                    </div>
                    {vendor.tds && (
                      <div>
                        <p className="text-slate-500">TDS</p>
                        <p className="font-medium">{vendor.tds}</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-auto">
              <div className="max-w-2xl">
                <div className="mb-6">
                  <p className="text-sm text-slate-500">Payment due period</p>
                  <p className="text-sm font-medium">{vendor.paymentTerms || 'Due on Receipt'}</p>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4">Payables</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="py-2">CURRENCY</th>
                        <th className="py-2 text-right">OUTSTANDING PAYABLES</th>
                        <th className="py-2 text-right">UNUSED CREDITS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2">INR- Indian Rupee</td>
                        <td className="py-2 text-right">{formatCurrency(vendor.payables || 0)}</td>
                        <td className="py-2 text-right">{formatCurrency(vendor.unusedCredits || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <button className="text-sm text-blue-600 mt-2">Enter Opening Balance</button>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Expenses</h4>
                    <div className="flex items-center gap-2">
                      <Select defaultValue="last-6-months">
                        <SelectTrigger className="w-36 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                          <SelectItem value="last-12-months">Last 12 Months</SelectItem>
                          <SelectItem value="this-year">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="accrual">
                        <SelectTrigger className="w-28 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accrual">Accrual</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">This chart is displayed in the organization's base currency.</p>
                  <div className="h-32 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-end justify-around px-4 pb-2">
                    {['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((month, i) => (
                      <div key={month} className="flex flex-col items-center">
                        <div className="w-8 bg-orange-200 dark:bg-orange-800 rounded-t" style={{ height: `${20 + i * 8}px` }}></div>
                        <span className="text-xs text-slate-500 mt-1">{month}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm mt-4">Total Expenses ( Last 6 Months ) - {formatCurrency(0)}</p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-4">Activity Timeline</h4>
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No activities yet</p>
                      </div>
                    ) : (
                      activities.map((activity) => {
                        const { date, time } = formatDateTime(activity.date);
                        return (
                          <div key={activity.id} className="flex gap-4">
                            <div className="text-right text-xs text-slate-500 w-24 flex-shrink-0">
                              <p>{date}</p>
                              <p>{time}</p>
                            </div>
                            <div className="relative">
                              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-blue-200"></div>
                              <div className="relative z-10 h-4 w-4 bg-white border-2 border-blue-500 rounded"></div>
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                              <h5 className="font-medium text-sm">{activity.title}</h5>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activity.description}</p>
                              <p className="text-xs text-slate-500 mt-2">
                                by <span className="text-blue-600">{activity.user}</span>
                                <button className="text-blue-600 ml-2">- View Details</button>
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="flex-1 overflow-auto p-6 mt-0">
          <div className="max-w-2xl">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg mb-6">
              <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-700">
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-bold">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-italic">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-underline">
                  <Underline className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="border-0 focus-visible:ring-0 min-h-24 resize-none"
                data-testid="input-comment"
              />
              <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  data-testid="button-add-comment"
                >
                  Add Comment
                </Button>
              </div>
            </div>

            <h4 className="text-sm font-medium text-slate-500 mb-4">ALL COMMENTS</h4>
            {comments.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No comments yet.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-slate-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="flex-1 overflow-auto mt-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-goto-transactions">
                    Go to transactions
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem>Bills</DropdownMenuItem>
                  <DropdownMenuItem>Bill Payments</DropdownMenuItem>
                  <DropdownMenuItem>Expenses</DropdownMenuItem>
                  <DropdownMenuItem>Purchase Orders</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-4">
              {transactionSections.map((section) => (
                <Collapsible
                  key={section.key}
                  open={expandedSections[section.key]}
                  onOpenChange={() => toggleSection(section.key)}
                >
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <div className="flex items-center gap-2">
                        {expandedSections[section.key] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{section.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Filter className="h-4 w-4" />
                          Status: All
                          <ChevronDown className="h-3 w-3" />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewTransaction(section.key === 'bills' ? 'bill' : section.key);
                          }}
                          data-testid={`button-new-${section.key}`}
                        >
                          <Plus className="h-3 w-3" />
                          New
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              {section.columns.map((col, i) => (
                                <th key={i} className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(transactions[section.key] || []).length === 0 ? (
                              <tr>
                                <td colSpan={section.columns.length} className="px-4 py-8 text-center text-slate-500">
                                  No {section.label.toLowerCase()} found. <button className="text-blue-600" onClick={() => handleNewTransaction(section.key === 'bills' ? 'bill' : section.key)}>Add New</button>
                                </td>
                              </tr>
                            ) : (
                              (transactions[section.key] || []).map((tx) => (
                                <tr key={tx.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                                  <td className="px-4 py-3">{formatDate(tx.date)}</td>
                                  <td className="px-4 py-3 text-blue-600">{tx.number}</td>
                                  <td className="px-4 py-3">{tx.orderNumber || '-'}</td>
                                  <td className="px-4 py-3">{tx.vendor || '-'}</td>
                                  <td className="px-4 py-3">{formatCurrency(tx.amount)}</td>
                                  <td className="px-4 py-3">{formatCurrency(tx.balance)}</td>
                                  <td className="px-4 py-3">
                                    <Badge variant="outline" className={tx.status === 'Paid' ? 'text-green-600' : tx.status === 'Draft' ? 'text-slate-500' : 'text-blue-600'}>
                                      {tx.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mails" className="flex-1 overflow-auto p-6 mt-0">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-medium">System Mails</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-link-email">
                  <Link2 className="h-4 w-4" />
                  Link Email account
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Gmail</DropdownMenuItem>
                <DropdownMenuItem>Outlook</DropdownMenuItem>
                <DropdownMenuItem>Other</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {mails.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Mail className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-1">No emails yet</p>
              <p className="text-sm">System emails sent to this vendor will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mails.map((mail) => {
                const { date, time } = formatDateTime(mail.sentAt);
                return (
                  <div key={mail.id} className="flex items-start gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 font-medium">R</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">To <span className="text-blue-600">{mail.to}</span></p>
                      <p className="font-medium text-sm mt-1">{mail.subject}</p>
                      <p className="text-sm text-slate-500 truncate">{mail.description}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 flex-shrink-0">
                      <p>{date}</p>
                      <p>{time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statement" className="flex-1 overflow-auto mt-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 no-print">
              <div className="flex items-center gap-3">
                <Select value={statementPeriod} onValueChange={setStatementPeriod}>
                  <SelectTrigger className="w-44 h-10 bg-white dark:bg-slate-800 border-slate-200" data-testid="select-period">
                    <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="This Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="this-quarter">This Quarter</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statementFilter} onValueChange={setStatementFilter}>
                  <SelectTrigger className="w-36 h-10 bg-white dark:bg-slate-800 border-slate-200" data-testid="select-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="outstanding">Outstanding</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 border-slate-200 hover:bg-slate-50"
                  onClick={handlePrint}
                  data-testid="button-print"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 px-4 border-slate-200">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                      <ChevronDown className="h-3 w-3 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleDownloadPDF}>
                      <FileText className="h-4 w-4 mr-2" /> Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadWord}>
                      <FileText className="h-4 w-4 mr-2" /> Download Word
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 h-10 px-6 shadow-sm"
                  size="sm"
                  onClick={() => setShowEmailDialog(true)}
                  data-testid="button-send-email"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden print:border-0 print:shadow-none" id="statement-print-area">
              {/* Header Design */}
              <div className="p-10 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                <div className="flex flex-col md:flex-row justify-between gap-10">
                  <div className="space-y-6">
                    {branding?.logo?.url ? (
                      <img src={branding.logo.url} alt="Organization Logo" className="h-20 w-auto object-contain" />
                    ) : (
                      <h4 className="text-3xl font-black tracking-tighter text-blue-600">{currentOrg?.name || 'Organization'}</h4>
                    )}
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <p className="font-bold text-slate-900 dark:text-white text-base">{currentOrg?.name}</p>
                      {currentOrg?.street1 && <p>{currentOrg.street1}</p>}
                      {currentOrg?.street2 && <p>{currentOrg.street2}</p>}
                      <p>{[currentOrg?.city, currentOrg?.state, currentOrg?.postalCode].filter(Boolean).join(', ')}</p>
                      {currentOrg?.gstin && <p className="pt-1"><span className="font-semibold text-slate-800 dark:text-slate-200">GSTIN:</span> {currentOrg.gstin}</p>}
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col justify-between items-end">
                    <div className="text-right mb-8">
                      <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Statement</h1>
                      <p className="text-blue-600 font-bold tracking-widest text-sm">01/12/2025 TO 31/12/2025</p>
                    </div>
                    
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400 max-w-xs">
                      <p className="font-bold text-slate-500 uppercase tracking-wider text-xs mb-2">Vendor Details</p>
                      <p className="font-black text-blue-600 text-xl leading-none mb-1">{vendor.displayName}</p>
                      {vendor.companyName && <p className="font-bold text-slate-800 dark:text-slate-200">{vendor.companyName}</p>}
                      <div className="space-y-0.5">
                        {formatAddress(vendor.billingAddress).map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                      {vendor.pan && <p className="pt-1"><span className="font-semibold text-slate-800 dark:text-slate-200">PAN:</span> {vendor.pan}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="px-10 py-8 bg-slate-50/30 dark:bg-slate-900/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opening Balance</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(vendor.openingBalance || 0)}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed Amount</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(billedAmount)}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Amount Paid</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(amountPaid)}</p>
                  </div>
                  <div className="bg-blue-600 p-5 rounded-xl border border-blue-700 shadow-lg transform hover:-translate-y-1 transition-all">
                    <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2">Balance Due</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(balanceDue)}</p>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="px-10 pb-10">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-900 dark:bg-slate-700 text-white">
                        <th className="py-4 px-6 text-left font-bold uppercase tracking-widest text-[10px]">Date</th>
                        <th className="py-4 px-6 text-left font-bold uppercase tracking-widest text-[10px]">Transaction Details</th>
                        <th className="py-4 px-6 text-center font-bold uppercase tracking-widest text-[10px]">Status</th>
                        <th className="py-4 px-6 text-right font-bold uppercase tracking-widest text-[10px]">Amount</th>
                        <th className="py-4 px-6 text-right font-bold uppercase tracking-widest text-[10px]">Payments</th>
                        <th className="py-4 px-6 text-right font-bold uppercase tracking-widest text-[10px]">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {statementTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400 italic font-medium">
                            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-20" />
                            No transactions found for the selected period
                          </td>
                        </tr>
                      ) : (
                        statementTransactions.map((tx, idx) => (
                          <tr key={tx.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="py-4 px-6 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">{formatDate(tx.date)}</td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{tx.type}</span>
                                <span className="text-xs text-slate-400 font-medium">#{tx.number}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <Badge variant="outline" className={`text-[9px] h-5 px-2 font-black uppercase tracking-widest border-2 ${
                                tx.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-100' : 
                                tx.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                              }`}>
                                {tx.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-white">
                              {tx.type === 'Bill' || tx.type === 'Expense' ? formatCurrency(tx.amount) : '—'}
                            </td>
                            <td className="py-4 px-6 text-right text-blue-600 font-bold">
                              {tx.type === 'Payment' || (tx.amount - (tx.balance || 0) > 0) ? 
                                formatCurrency(tx.type === 'Payment' ? tx.amount : (tx.amount - (tx.balance || 0))) : 
                                '—'
                              }
                            </td>
                            <td className="py-4 px-6 text-right font-black text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-900/10">
                              {formatCurrency(tx.balance || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 dark:bg-slate-800 text-white font-black border-t-4 border-blue-600">
                        <td colSpan={5} className="py-5 px-6 text-right uppercase tracking-widest text-xs">Closing Balance Due</td>
                        <td className="py-5 px-6 text-right text-xl">{formatCurrency(balanceDue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.2em]">Thank you for your business</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Statement via Email</DialogTitle>
            <DialogDescription>
              Send the vendor statement to {vendor.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="Enter email address"
                data-testid="input-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSendEmail}
              data-testid="button-send-email-confirm"
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VendorsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("name");
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [selectedVendorForAttachments, setSelectedVendorForAttachments] = useState<Vendor | null>(null);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/vendors/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedVendor(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch vendor detail:', error);
    }
  };

  const handleVendorClick = (vendor: Vendor) => {
    fetchVendorDetail(vendor.id);
  };

  const handleClosePanel = () => {
    setSelectedVendor(null);
  };

  const handleEditVendor = () => {
    if (selectedVendor) {
      setLocation(`/vendors/${selectedVendor.id}/edit`);
    }
  };

  const toggleSelectVendor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedVendors.includes(id)) {
      setSelectedVendors(selectedVendors.filter(i => i !== id));
    } else {
      setSelectedVendors([...selectedVendors, id]);
    }
  };

  const handleClone = async () => {
    if (!selectedVendor) return;
    try {
      const response = await fetch(`/api/vendors/${selectedVendor.id}/clone`, { method: 'POST' });
      if (response.ok) {
        toast({ title: "Vendor cloned successfully" });
        fetchVendors();
        handleClosePanel();
      }
    } catch (error) {
      toast({ title: "Failed to clone vendor", variant: "destructive" });
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedVendor) return;
    try {
      const newStatus = selectedVendor.status === 'active' ? 'inactive' : 'active';
      const response = await fetch(`/api/vendors/${selectedVendor.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast({ title: `Vendor marked as ${newStatus}` });
        fetchVendors();
        handleClosePanel();
      }
    } catch (error) {
      toast({ title: "Failed to update vendor status", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    setVendorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    try {
      const response = await fetch(`/api/vendors/${vendorToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: "Vendor deleted successfully" });
        fetchVendors();
        if (selectedVendor?.id === vendorToDelete) {
          handleClosePanel();
        }
      }
    } catch (error) {
      toast({ title: "Failed to delete vendor", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
    }
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>, vendorId: string) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const selectedAttachments = selectedVendorForAttachments?.attachments || [];
      const totalFiles = selectedAttachments.length + newAttachments.length + fileArray.length;

      if (totalFiles > 10) {
        toast({ title: "Maximum 10 files allowed", variant: "destructive" });
        return;
      }

      const validFiles = fileArray.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: `${file.name} exceeds 10MB limit`, variant: "destructive" });
          return false;
        }
        return true;
      });

      setNewAttachments(prev => [...prev, ...validFiles]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (vendorId: string, attachmentId: string) => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast({ title: "Attachment deleted successfully" });
        fetchVendors();
        if (selectedVendor?.id === vendorId) {
          fetchVendorDetail(vendorId);
        }
      }
    } catch (error) {
      toast({ title: "Failed to delete attachment", variant: "destructive" });
    }
  };

  const handleSaveAttachments = async (vendorId: string) => {
    if (newAttachments.length === 0) return;

    try {
      const formData = new FormData();
      newAttachments.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/vendors/${vendorId}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast({ title: "Attachments saved successfully" });
        setNewAttachments([]);
        setShowAttachmentsDialog(false);
        setSelectedVendorForAttachments(null);
        fetchVendors();
        if (selectedVendor?.id === vendorId) {
          fetchVendorDetail(vendorId);
        }
      }
    } catch (error) {
      toast({ title: "Failed to save attachments", variant: "destructive" });
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedVendors = [...filteredVendors].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.displayName || '').localeCompare(b.displayName || '');
      case 'companyName':
        return (a.companyName || '').localeCompare(b.companyName || '');
      case 'payables':
        return (b.payables || 0) - (a.payables || 0);
      case 'unusedCredits':
        return (b.unusedCredits || 0) - (a.unusedCredits || 0);
      default:
        return 0;
    }
  });

  const { currentPage, totalPages, totalItems, itemsPerPage, paginatedItems, goToPage } = usePagination(sortedVendors, 10);

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] animate-in fade-in duration-300">
      <ResizablePanelGroup direction="horizontal" className="h-full w-full" autoSaveId="vendors-layout">
        <ResizablePanel
          defaultSize={selectedVendor ? 30 : 100}
          minSize={20}
          className="flex flex-col overflow-hidden bg-white"
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Active Vendors</h1>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setLocation("/vendors/new")}
                className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-9"
                data-testid="button-new-vendor"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-more-options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs text-slate-500">SORT BY</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setSortBy('name')} className={sortBy === 'name' ? 'bg-blue-50' : ''}>
                    <ArrowUpDown className="mr-2 h-4 w-4" /> Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('companyName')} className={sortBy === 'companyName' ? 'bg-blue-50' : ''}>
                    <ArrowUpDown className="mr-2 h-4 w-4" /> Company Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('payables')} className={sortBy === 'payables' ? 'bg-blue-50' : ''}>
                    <ArrowUpDown className="mr-2 h-4 w-4" /> Payables (BCY)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Upload className="mr-2 h-4 w-4" /> Import
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" /> Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" /> Preferences
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchVendors}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh List
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading vendors...</div>
            ) : sortedVendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No vendors yet</h3>
                <p className="text-slate-500 mb-4 max-w-sm">
                  Add your first vendor to start tracking purchases and managing supplier relationships.
                </p>
                <Button
                  onClick={() => setLocation("/vendors/new")}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-add-first-vendor"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Your First Vendor
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="w-10 px-3 py-3 text-left">
                      <Checkbox
                        checked={selectedVendors.length === sortedVendors.length && sortedVendors.length > 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedVendors.length === sortedVendors.length) {
                            setSelectedVendors([]);
                          } else {
                            setSelectedVendors(sortedVendors.map(v => v.id));
                          }
                        }}
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Name</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Phone</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Payables (BCY)</th>
                    <th className="w-10 px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {paginatedItems.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${selectedVendor?.id === vendor.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      onClick={() => handleVendorClick(vendor)}
                      data-testid={`row-vendor-${vendor.id}`}
                    >
                      <td className="px-3 py-3">
                        <Checkbox
                          checked={selectedVendors.includes(vendor.id)}
                          onClick={(e) => toggleSelectVendor(vendor.id, e)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-blue-600 dark:text-blue-400">{vendor.displayName}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {vendor.companyName || '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {vendor.email || '-'}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {vendor.workPhone || '-'}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-400">
                        {formatCurrencyLocal(vendor.payables || 0)}
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVendorForAttachments(vendor);
                            setShowAttachmentsDialog(true);
                          }}
                          data-testid={`button-attachments-${vendor.id}`}
                        >
                          <Paperclip className={`h-4 w-4 ${vendor.attachments && vendor.attachments.length > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {sortedVendors.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={goToPage}
              />
            )}
          </div>
        </ResizablePanel>

        {selectedVendor && (
          <>
            <ResizableHandle withHandle className="w-1 bg-slate-200 hover:bg-blue-400 hover:w-1.5 transition-all cursor-col-resize" />
            <ResizablePanel defaultSize={70} minSize={30} className="bg-white">
              <VendorDetailPanel
                vendor={selectedVendor}
                onClose={handleClosePanel}
                onEdit={handleEditVendor}
                onClone={handleClone}
                onToggleStatus={handleToggleStatus}
                onDelete={() => handleDelete(selectedVendor.id)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {showAttachmentsDialog && selectedVendorForAttachments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Attachments - {selectedVendorForAttachments.displayName}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setShowAttachmentsDialog(false);
                  setNewAttachments([]);
                  setSelectedVendorForAttachments(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {selectedVendorForAttachments.attachments && selectedVendorForAttachments.attachments.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Uploaded Files ({selectedVendorForAttachments.attachments.length}/10)</p>
                  <div className="space-y-2">
                    {selectedVendorForAttachments.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 dark:text-white truncate">{attachment.name}</p>
                          <p className="text-xs text-slate-500">{(attachment.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 flex-shrink-0"
                          onClick={() => handleDeleteAttachment(selectedVendorForAttachments.id, attachment.id)}
                          data-testid={`button-delete-attachment-${attachment.id}`}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-upload-new-attachment"
                type="button"
              >
                <Upload className="h-4 w-4" />
                Upload your Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => handleAttachmentUpload(e, selectedVendorForAttachments.id)}
                accept="*/*"
              />

              {newAttachments.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">New Files to Upload</p>
                  <div className="space-y-2">
                    {newAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 dark:text-white truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 flex-shrink-0"
                          onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== index))}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">You can upload a maximum of 10 files, 10MB each</p>

              <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAttachmentsDialog(false);
                    setNewAttachments([]);
                    setSelectedVendorForAttachments(null);
                  }}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleSaveAttachments(selectedVendorForAttachments.id)}
                  data-testid="button-save-attachments"
                  type="button"
                  disabled={newAttachments.length === 0}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vendor? This action cannot be undone.
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
