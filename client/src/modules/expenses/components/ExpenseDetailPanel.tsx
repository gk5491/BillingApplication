import { X, Edit, Printer, MoreHorizontal, Upload, Trash2, FileText, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Expense {
    id: string;
    expenseNumber: string;
    date: string;
    expenseAccount: string;
    amount: number;
    currency: string;
    paidThrough: string;
    expenseType: string;
    sac: string;
    vendorId: string;
    vendorName: string;
    gstTreatment: string;
    sourceOfSupply: string;
    destinationOfSupply: string;
    reverseCharge: boolean;
    tax: string;
    taxAmount: number;
    amountIs: string;
    invoiceNumber: string;
    notes: string;
    customerId: string;
    customerName: string;
    reportingTags: string[];
    isBillable: boolean;
    status: string;
    attachments: string[];
    createdAt: string;
    updatedAt: string;
    gstin?: string;
}

interface ExpenseDetailPanelProps {
    expense: Expense;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export default function ExpenseDetailPanel({
    expense,
    onClose,
    onEdit,
    onDelete,
}: ExpenseDetailPanelProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const getTaxLabel = (tax: string) => {
        const taxMap: Record<string, string> = {
            'gst_5': 'GST5 [5%]',
            'gst_12': 'GST12 [12%]',
            'gst_18': 'GST18 [18%]',
            'gst_28': 'GST28 [28%]',
            'igst_5': 'IGST5 [5%]',
            'igst_12': 'IGST12 [12%]',
            'igst_18': 'IGST18 [18%]',
            'igst_28': 'IGST28 [28%]',
            'exempt': 'Exempt [0%]',
            'none': 'None [0%]',
        };
        return taxMap[tax] || 'IGST0 [0%]';
    };

    const handlePrint = async () => {
        try {
            const printContent = document.getElementById('expense-print-content');
            if (!printContent) {
                console.error('Expense print content not found');
                return;
            }

            // Use the unified print utility
            const { printPDFView } = await import("@/lib/pdf-utils");
            await printPDFView("expense-print-content", `Expense - ${expense.expenseNumber}`);
        } catch (error) {
            console.error("Print error:", error);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background dark:bg-background">
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Expense Details</h2>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" data-testid="button-expand">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-panel">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 border-b">
                <Button variant="ghost" size="sm" className="gap-2" onClick={onEdit} data-testid="button-edit-expense">
                    <Edit className="h-4 w-4" />
                    Edit
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={handlePrint} data-testid="button-print-expense">
                    <Printer className="h-4 w-4" />
                    Print
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid="button-more-actions">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem data-testid="action-clone">
                            <FileText className="h-4 w-4 mr-2" />
                            Clone
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={onDelete} data-testid="action-delete">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="flex gap-6 p-6">
                    <div className="flex-1 space-y-5">
                        <div>
                            <p className="text-sm text-muted-foreground">Paid Through</p>
                            <p className="font-medium">{expense.paidThrough || 'Undeposited Funds'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Tax</p>
                            <p className="font-medium">{getTaxLabel(expense.tax)}</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Tax Amount</p>
                            <p className="font-medium">{formatCurrency(expense.taxAmount || 0)} ( {expense.amountIs === 'tax_inclusive' ? 'Inclusive' : 'Exclusive'} )</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Ref #</p>
                            <p className="font-medium">{expense.invoiceNumber || expense.expenseNumber}</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Paid To</p>
                            <p className="font-medium text-blue-600 hover:underline cursor-pointer" data-testid="link-vendor">
                                {expense.vendorName || '-'}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">GST Treatment</p>
                            <p className="font-medium">{expense.gstTreatment || 'Registered Business - Regular'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">GSTIN / UIN</p>
                            <p className="font-medium">{expense.gstin || expense.vendorId || '09AACCI9016K1ZB'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Source of Supply</p>
                            <p className="font-medium">{expense.sourceOfSupply || 'Uttar Pradesh'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Destination of Supply</p>
                            <p className="font-medium">{expense.destinationOfSupply || 'Maharashtra'}</p>
                        </div>
                    </div>

                    <div className="w-52">
                        <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
                            <div className="h-12 w-12 mx-auto mb-3 border-2 border-dashed rounded flex items-center justify-center">
                                <Upload className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">Upload your Files</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6">
                    <Tabs defaultValue="journal" className="w-full">
                        <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0">
                            <TabsTrigger
                                value="journal"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
                                data-testid="tab-journal"
                            >
                                Journal
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="journal" className="mt-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Amount is displayed in your base currency</span>
                                <Badge variant="secondary" className="bg-green-600 text-white hover:bg-green-600">
                                    INR
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Expense</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">ACCOUNT</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">DEBIT</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">CREDIT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr>
                                                <td className="px-4 py-3">{expense.paidThrough || 'Undeposited Funds'}</td>
                                                <td className="px-4 py-3 text-right">0.00</td>
                                                <td className="px-4 py-3 text-right">{expense.amount.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3">Input IGST</td>
                                                <td className="px-4 py-3 text-right">0.00</td>
                                                <td className="px-4 py-3 text-right">0.00</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3">{expense.expenseAccount}</td>
                                                <td className="px-4 py-3 text-right">{expense.amount.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">0.00</td>
                                            </tr>
                                            <tr className="font-semibold bg-muted/30">
                                                <td className="px-4 py-3"></td>
                                                <td className="px-4 py-3 text-right">{expense.amount.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">{expense.amount.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Hidden Print Content */}
            <div
                id="expense-print-content"
                className="absolute opacity-0 pointer-events-none"
                style={{
                    left: '-200vw',
                    top: 0,
                    zIndex: -1,
                    width: '210mm',
                    minHeight: '297mm',
                    backgroundColor: 'white',
                    padding: '48px',
                    visibility: 'hidden',
                    fontFamily: 'Arial, sans-serif',
                    color: '#000'
                }}
            >
                {/* Print Header */}
                <div style={{ marginBottom: '32px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 8px 0' }}>
                        EXPENSE DETAILS
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>
                        Expense # {expense.expenseNumber}
                    </p>
                </div>

                {/* Expense Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>
                            Expense Information
                        </h3>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <p><strong>Date:</strong> {formatDate(expense.date)}</p>
                            <p><strong>Amount:</strong> {formatCurrency(expense.amount)}</p>
                            <p><strong>Currency:</strong> {expense.currency}</p>
                            <p><strong>Expense Account:</strong> {expense.expenseAccount}</p>
                            <p><strong>Paid Through:</strong> {expense.paidThrough}</p>
                            <p><strong>Expense Type:</strong> {expense.expenseType}</p>
                            {expense.invoiceNumber && <p><strong>Invoice #:</strong> {expense.invoiceNumber}</p>}
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>
                            Vendor & Tax Details
                        </h3>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <p><strong>Vendor:</strong> {expense.vendorName || 'Not specified'}</p>
                            <p><strong>GST Treatment:</strong> {expense.gstTreatment}</p>
                            <p><strong>Source of Supply:</strong> {expense.sourceOfSupply}</p>
                            <p><strong>Destination of Supply:</strong> {expense.destinationOfSupply}</p>
                            <p><strong>Tax:</strong> {getTaxLabel(expense.tax)}</p>
                            <p><strong>Tax Amount:</strong> {formatCurrency(expense.taxAmount || 0)}</p>
                            {expense.reverseCharge && <p><strong>Reverse Charge:</strong> Yes</p>}
                        </div>
                    </div>
                </div>

                {/* Customer Information */}
                {expense.customerName && (
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>
                            Customer Information
                        </h3>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <p><strong>Customer:</strong> {expense.customerName}</p>
                            <p><strong>Billable:</strong> {expense.isBillable ? 'Yes' : 'No'}</p>
                        </div>
                    </div>
                )}

                {/* Notes */}
                {expense.notes && (
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>
                            Notes
                        </h3>
                        <div style={{ fontSize: '14px', lineHeight: '1.6', padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                            {expense.notes}
                        </div>
                    </div>
                )}

                {/* Status */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#374151' }}>
                        Status Information
                    </h3>
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        <p><strong>Status:</strong> {expense.status}</p>
                        <p><strong>Created:</strong> {formatDate(expense.createdAt)}</p>
                        <p><strong>Updated:</strong> {formatDate(expense.updatedAt)}</p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0' }}>
                        Generated on {new Date().toLocaleDateString('en-IN')}
                    </p>
                </div>
            </div>
        </div>
    );
}
