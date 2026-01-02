import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Plus, X, Search, Upload, ChevronDown, HelpCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSelectDropdown } from "@/components/AccountSelectDropdown";
import { VendorAddressModal } from "@/components/VendorAddressModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Vendor {
  id: string;
  displayName: string;
  companyName?: string;
  billingAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    countryRegion?: string;
  };
  gstin?: string;
}

interface Customer {
  id: string;
  name: string;
  displayName: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
}

interface Item {
  id: string;
  name: string;
  description?: string;
  purchaseDescription?: string;
  rate?: string | number;
  purchaseRate?: string | number;
  sellingPrice?: number;
  purchasePrice?: number;
  hsnSac?: string;
  hsn?: string;
  sku?: string;
  usageUnit?: string;
  unit?: string;
  intraStateTax?: string;
  interStateTax?: string;
  tax?: number;
}

interface LineItem {
  id: string;
  itemId: string;
  itemName: string;
  description: string;
  account: string;
  quantity: number;
  rate: number;
  tax: string;
  taxAmount: number;
  amount: number;
}

const PAYMENT_TERMS = [
  "Due on Receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Due end of the month",
  "Due end of next month"
];

const SHIPMENT_PREFERENCES = [
  "Standard Shipping",
  "Express Shipping",
  "Overnight Shipping",
  "Local Pickup",
  "Freight Shipping"
];

const TAX_OPTIONS = [
  { value: "none", label: "Select a Tax" },
  { value: "gst5", label: "GST 5%" },
  { value: "gst12", label: "GST 12%" },
  { value: "gst18", label: "GST 18%" },
  { value: "gst28", label: "GST 28%" },
  { value: "igst5", label: "IGST 5%" },
  { value: "igst12", label: "IGST 12%" },
  { value: "igst18", label: "IGST 18%" },
  { value: "igst28", label: "IGST 28%" }
];

const INDIAN_STATES = [
  "AN - Andaman and Nicobar Islands",
  "AP - Andhra Pradesh",
  "AR - Arunachal Pradesh",
  "AS - Assam",
  "BR - Bihar",
  "CH - Chandigarh",
  "CT - Chhattisgarh",
  "DD - Daman and Diu",
  "DL - Delhi",
  "GA - Goa",
  "GJ - Gujarat",
  "HP - Himachal Pradesh",
  "HR - Haryana",
  "JH - Jharkhand",
  "JK - Jammu and Kashmir",
  "KA - Karnataka",
  "KL - Kerala",
  "LA - Ladakh",
  "LD - Lakshadweep",
  "MH - Maharashtra",
  "ML - Meghalaya",
  "MN - Manipur",
  "MP - Madhya Pradesh",
  "MZ - Mizoram",
  "NL - Nagaland",
  "OR - Odisha",
  "PB - Punjab",
  "PY - Puducherry",
  "RJ - Rajasthan",
  "SK - Sikkim",
  "TN - Tamil Nadu",
  "TR - Tripura",
  "TS - Telangana",
  "UK - Uttarakhand",
  "UP - Uttar Pradesh",
  "WB - West Bengal"
];

const GST_TREATMENTS = [
  "Registered Business - Regular",
  "Registered Business - Composition",
  "Unregistered Business",
  "Consumer",
  "Overseas",
  "Special Economic Zone",
  "Deemed Export"
];

// Account dropdown is now handled by AccountSelectDropdown component

export default function PurchaseOrderCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    vendorId: "",
    vendorName: "",
    gstTreatment: "",
    sourceOfSupply: "",
    destinationOfSupply: "",
    vendorBillingAddress: { street1: "", street2: "", city: "", state: "", pinCode: "", countryRegion: "India" },
    vendorShippingAddress: { street1: "", street2: "", city: "", state: "", pinCode: "", countryRegion: "India" },
    deliveryAddressType: "organization",
    deliveryAddress: {
      attention: "",
      street1: "",
      street2: "",
      city: "",
      state: "",
      pinCode: "",
      countryRegion: "India"
    },
    organizationDetails: {
      name: "Rohan Bhosale",
      address: "Hinjewadi - Wakad road\nHinjewadi\nPune, Maharashtra\nIndia, 411057"
    },
    selectedCustomer: null as Customer | null,
    customerSearchQuery: "",
    referenceNumber: "",
    date: new Date().toISOString().split('T')[0],
    deliveryDate: "",
    paymentTerms: "Due on Receipt",
    shipmentPreference: "",
    reverseCharge: false,
    notes: "",
    termsAndConditions: "",
    discountType: "percent",
    discountValue: 0,
    taxType: "TDS",
    taxCategory: "",
    adjustment: 0,
    adjustmentDescription: ""
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      itemId: "",
      itemName: "",
      description: "",
      account: "",
      quantity: 1,
      rate: 0,
      tax: "none",
      taxAmount: 0,
      amount: 0
    }
  ]);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);

  // Address modal states
  const [billingAddressModalOpen, setBillingAddressModalOpen] = useState(false);
  const [shippingAddressModalOpen, setShippingAddressModalOpen] = useState(false);

  // Get vendorId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const vendorIdFromUrl = urlParams.get('vendorId');

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Pre-fill vendor data if vendorId is in URL
  useEffect(() => {
    if (vendorIdFromUrl && vendors.length > 0 && !formData.vendorId) {
      const vendor = vendors.find(v => v.id === vendorIdFromUrl);
      if (vendor) {
        setSelectedVendor(vendor);
        setFormData(prev => ({
          ...prev,
          vendorId: vendor.id,
          vendorName: vendor.displayName || `${vendor.firstName} ${vendor.lastName}`.trim() || vendor.companyName || ""
        }));
      }
    }
  }, [vendorIdFromUrl, vendors]);

  const fetchInitialData = async () => {
    try {
      const [vendorsRes, itemsRes, nextNumberRes, customersRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch('/api/items'),
        fetch('/api/purchase-orders/next-number'),
        fetch('/api/customers')
      ]);

      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        setVendors(data.data || []);
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.data || []);
      }

      if (nextNumberRes.ok) {
        const data = await nextNumberRes.json();
        setPurchaseOrderNumber(data.data.purchaseOrderNumber);
      }

      if (customersRes.ok) {
        const data = await customersRes.json();
        const customersList = data.customers || data.data || [];
        setCustomers(customersList);
        setFilteredCustomers(customersList);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setSelectedVendor(vendor);
      setFormData({
        ...formData,
        vendorId: vendor.id,
        vendorName: vendor.displayName,
        gstTreatment: (vendor as any).gstTreatment || "",
        vendorBillingAddress: vendor.billingAddress || { street1: "", street2: "", city: "", state: "", pinCode: "", countryRegion: "India" },
        vendorShippingAddress: (vendor as any).shippingAddress || { street1: "", street2: "", city: "", state: "", pinCode: "", countryRegion: "India" }
      });
      setVendorDropdownOpen(false);
    }
  };

  const handleCustomerSearch = (query: string) => {
    setFormData({ ...formData, customerSearchQuery: query });
    if (!query.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name?.toLowerCase().includes(query.toLowerCase()) ||
        customer.displayName?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setFormData({
      ...formData,
      selectedCustomer: customer,
      customerSearchQuery: customer.displayName
    });
    setCustomerDropdownOpen(false);
  };

  // Address modal handlers
  const handleBillingAddressUpdate = (address: any) => {
    setFormData({
      ...formData,
      vendorBillingAddress: {
        street1: address.street1 || "",
        street2: address.street2 || "",
        city: address.city || "",
        state: address.state || "",
        pinCode: address.pinCode || "",
        countryRegion: address.countryRegion || "India"
      }
    });
  };

  const handleShippingAddressUpdate = (address: any) => {
    setFormData({
      ...formData,
      vendorShippingAddress: {
        street1: address.street1 || "",
        street2: address.street2 || "",
        city: address.city || "",
        state: address.state || "",
        pinCode: address.pinCode || "",
        countryRegion: address.countryRegion || "India"
      }
    });
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        if (field === 'quantity' || field === 'rate' || field === 'tax') {
          const baseAmount = updated.quantity * updated.rate;
          let taxRate = 0;
          if (updated.tax && updated.tax !== 'none') {
            taxRate = parseInt(updated.tax.replace(/\D/g, '')) || 0;
          }
          updated.taxAmount = (baseAmount * taxRate) / 100;
          updated.amount = baseAmount + updated.taxAmount;
        }

        return updated;
      }
      return item;
    }));
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: String(Date.now()),
        itemId: "",
        itemName: "",
        description: "",
        account: "",
        quantity: 1,
        rate: 0,
        tax: "none",
        taxAmount: 0,
        amount: 0
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const selectItem = (lineItemId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      // Parse rate - prioritize purchaseRate, then rate, then purchasePrice, then sellingPrice
      // Remove commas from string rates before parsing (e.g., "45,000.00" -> 45000)
      const purchaseRate = item.purchaseRate !== undefined ? parseFloat(String(item.purchaseRate).replace(/,/g, '')) : 0;
      const rate = item.rate !== undefined ? parseFloat(String(item.rate).replace(/,/g, '')) : 0;
      const finalRate = purchaseRate || item.purchasePrice || rate || item.sellingPrice || 0;

      // Get description - prioritize purchaseDescription for purchase orders
      const description = item.purchaseDescription || item.description || '';

      // Get tax rate from item
      let taxValue = 'none';
      if (item.intraStateTax) {
        // Convert tax string like 'gst18' to proper format
        const taxMatch = item.intraStateTax.match(/(gst|igst)(\d+)/i);
        if (taxMatch) {
          taxValue = `gst_${taxMatch[2]}`;
        }
      }

      setLineItems(prev => prev.map(lineItem => {
        if (lineItem.id === lineItemId) {
          const baseAmount = lineItem.quantity * finalRate;
          let taxRate = 0;
          if (taxValue && taxValue !== 'none') {
            taxRate = parseInt(taxValue.replace(/\D/g, '')) || 0;
          }
          const taxAmount = (baseAmount * taxRate) / 100;
          return {
            ...lineItem,
            itemId: item.id,
            itemName: item.name,
            description: description,
            rate: finalRate,
            tax: taxValue,
            taxAmount: taxAmount,
            amount: baseAmount + taxAmount
          };
        }
        return lineItem;
      }));
    }
  };

  const calculateSubTotal = (): number => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateDiscount = (): number => {
    const subTotal = calculateSubTotal();
    if (formData.discountType === 'percent') {
      return (subTotal * formData.discountValue) / 100;
    }
    return formData.discountValue;
  };

  const calculateTaxTotal = (): number => {
    return lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  };

  const calculateTotal = (): number => {
    const subTotal = calculateSubTotal();
    const discount = calculateDiscount();
    const taxTotal = calculateTaxTotal();
    return subTotal - discount + taxTotal + formData.adjustment;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (uploadedFiles.length + files.length > 10) {
      toast({ title: "Maximum 10 files allowed", variant: "destructive" });
      return;
    }
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
    setUploadedFiles([...uploadedFiles, ...validFiles]);
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    if (!formData.vendorId) {
      toast({ title: "Please select a vendor", variant: "destructive" });
      return;
    }

    const validItems = lineItems.filter(item => item.itemName && item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          purchaseOrderNumber,
          items: validItems,
          subTotal: calculateSubTotal(),
          discountAmount: calculateDiscount(),
          taxAmount: calculateTaxTotal(),
          total: calculateTotal(),
          status: saveAsDraft ? 'DRAFT' : 'ISSUED'
        })
      });

      if (response.ok) {
        toast({ title: saveAsDraft ? "Draft saved successfully" : "Purchase order created successfully" });
        setLocation('/purchase-orders');
      } else {
        toast({ title: "Failed to create purchase order", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to create purchase order", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20">
      <div className="fixed inset-y-0 left-0 right-0 bg-slate-50 shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300" style={{ marginLeft: 'calc(100vw - 80vw)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <span className="text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            New Purchase Order
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/purchase-orders')}
            className="h-8 w-8"
            data-testid="button-close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Vendor Section */}
            <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
              <Label className="text-black pt-2.5">Vendor Name<span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Popover open={vendorDropdownOpen} onOpenChange={setVendorDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between bg-white"
                      data-testid="select-vendor"
                    >
                      {selectedVendor ? selectedVendor.displayName : "Select a Vendor"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search vendors..." />
                      <CommandEmpty>No vendor found.</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-y-auto">
                        {vendors.map(vendor => (
                          <CommandItem
                            key={vendor.id}
                            onSelect={() => handleVendorChange(vendor.id)}
                          >
                            {vendor.displayName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => setLocation('/vendors/new')}
                  data-testid="button-add-vendor"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Vendor Details Section */}
            {formData.vendorId && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Vendor Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Billing Address */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-slate-700 uppercase tracking-wide">BILLING ADDRESS</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-slate-600"
                        onClick={() => setBillingAddressModalOpen(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="bg-slate-50 rounded-md p-3 min-h-[80px] text-sm">
                      {formData.vendorBillingAddress.street1 ? (
                        <div className="space-y-1">
                          <p className="font-medium">{selectedVendor?.displayName}</p>
                          <p>{formData.vendorBillingAddress.street1}</p>
                          {formData.vendorBillingAddress.street2 && <p>{formData.vendorBillingAddress.street2}</p>}
                          <p>{formData.vendorBillingAddress.city}</p>
                          <p>{formData.vendorBillingAddress.state} {formData.vendorBillingAddress.pinCode}</p>
                          <p>{formData.vendorBillingAddress.countryRegion}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Click edit to add billing address</p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-slate-700 uppercase tracking-wide">SHIPPING ADDRESS</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-slate-600"
                        onClick={() => setShippingAddressModalOpen(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="bg-slate-50 rounded-md p-3 min-h-[80px] text-sm">
                      {formData.vendorShippingAddress.street1 ? (
                        <div className="space-y-1">
                          <p className="font-medium">{selectedVendor?.displayName}</p>
                          <p>{formData.vendorShippingAddress.street1}</p>
                          {formData.vendorShippingAddress.street2 && <p>{formData.vendorShippingAddress.street2}</p>}
                          <p>{formData.vendorShippingAddress.city}</p>
                          <p>{formData.vendorShippingAddress.state} {formData.vendorShippingAddress.pinCode}</p>
                          <p>{formData.vendorShippingAddress.countryRegion}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Click edit to add shipping address</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* GST Treatment */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700 uppercase tracking-wide">GST Treatment</Label>
                  <Select value={formData.gstTreatment} onValueChange={(value) => setFormData({ ...formData, gstTreatment: value })}>
                    <SelectTrigger className="bg-white border-slate-200" data-testid="select-gst-treatment">
                      <SelectValue placeholder="Select GST Treatment" />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_TREATMENTS.map(treatment => (
                        <SelectItem key={treatment} value={treatment}>{treatment}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Source of Supply */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700 uppercase tracking-wide">Source of Supply<span className="text-red-500 ml-1">*</span></Label>
                    <Select value={formData.sourceOfSupply} onValueChange={(value) => setFormData({ ...formData, sourceOfSupply: value })}>
                      <SelectTrigger className="bg-white border-slate-200" data-testid="select-source-of-supply">
                        <SelectValue placeholder="Select source state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Destination of Supply */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-700 uppercase tracking-wide">Destination of Supply<span className="text-red-500 ml-1">*</span></Label>
                    <Select value={formData.destinationOfSupply} onValueChange={(value) => setFormData({ ...formData, destinationOfSupply: value })}>
                      <SelectTrigger className="bg-white border-slate-200" data-testid="select-destination-of-supply">
                        <SelectValue placeholder="Select destination state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Address Section */}
            <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
              <Label className="text-black pt-2.5">Delivery Address<span className="text-red-500">*</span></Label>
              <div className="space-y-3">
                <RadioGroup
                  value={formData.deliveryAddressType}
                  onValueChange={(value) => setFormData({ ...formData, deliveryAddressType: value, selectedCustomer: null, customerSearchQuery: "" })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="organization" id="org" className="border-blue-600 text-blue-600" />
                    <Label htmlFor="org" className="cursor-pointer">Organization</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customer" id="customer" className="border-blue-600 text-blue-600" />
                    <Label htmlFor="customer" className="cursor-pointer">Customer</Label>
                  </div>
                </RadioGroup>

                {formData.deliveryAddressType === "organization" && (
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="orgName" className="text-sm font-medium">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={formData.organizationDetails.name}
                        onChange={(e) => setFormData({
                          ...formData,
                          organizationDetails: {
                            ...formData.organizationDetails,
                            name: e.target.value
                          }
                        })}
                        placeholder="Enter organization name"
                        className="bg-white"
                        data-testid="input-org-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgAddress" className="text-sm font-medium">Organization Address</Label>
                      <Textarea
                        id="orgAddress"
                        value={formData.organizationDetails.address}
                        onChange={(e) => setFormData({
                          ...formData,
                          organizationDetails: {
                            ...formData.organizationDetails,
                            address: e.target.value
                          }
                        })}
                        placeholder="Enter complete address"
                        className="bg-white min-h-[80px]"
                        rows={4}
                        data-testid="input-org-address"
                      />
                    </div>
                  </div>
                )}

                {formData.deliveryAddressType === "customer" && (
                  <div className="space-y-3">
                    <Popover open={customerDropdownOpen} onOpenChange={setCustomerDropdownOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between bg-white"
                        >
                          {formData.selectedCustomer ? formData.selectedCustomer.displayName : "Select a Customer"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search customers..."
                            value={formData.customerSearchQuery}
                            onValueChange={handleCustomerSearch}
                          />
                          <div className="p-2 border-b">
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => {
                                setCustomerDropdownOpen(false);
                                setLocation('/customers/new');
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create Customer
                            </Button>
                          </div>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {filteredCustomers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                onSelect={() => handleCustomerSelect(customer)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.displayName || customer.name}</span>
                                  {customer.email && <span className="text-sm text-slate-500">{customer.email}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {formData.selectedCustomer && (
                      <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                        <div className="font-medium text-slate-900 mb-1">{formData.selectedCustomer.displayName}</div>
                        {formData.selectedCustomer.billingAddress && (
                          <div className="whitespace-pre-line">
                            {[
                              formData.selectedCustomer.billingAddress.street,
                              formData.selectedCustomer.billingAddress.city,
                              formData.selectedCustomer.billingAddress.state,
                              formData.selectedCustomer.billingAddress.country,
                              formData.selectedCustomer.billingAddress.pincode
                            ].filter(Boolean).join('\n')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-black font-medium text-sm">Purchase Order#<span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    value={purchaseOrderNumber}
                    readOnly
                    className="bg-white pr-8 text-sm"
                    data-testid="input-po-number"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth={2} />
                      <path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-sm">Reference#</Label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="bg-white text-sm"
                  data-testid="input-reference"
                />
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-medium text-sm">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-white text-sm"
                  data-testid="input-date"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-sm">Delivery Date</Label>
                <Input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="bg-white text-sm"
                  placeholder="dd/MM/yyyy"
                  data-testid="input-delivery-date"
                />
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-medium text-sm">Payment Terms</Label>
                <Select
                  value={formData.paymentTerms}
                  onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                >
                  <SelectTrigger className="bg-white text-sm" data-testid="select-payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map(term => (
                      <SelectItem key={term} value={term}>{term}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium text-sm">Shipment Preference</Label>
                <Select
                  value={formData.shipmentPreference}
                  onValueChange={(value) => setFormData({ ...formData, shipmentPreference: value })}
                >
                  <SelectTrigger className="bg-white text-sm" data-testid="select-shipment">
                    <SelectValue placeholder="Choose the shipment preference..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_PREFERENCES.map(pref => (
                      <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div></div>
            </div>

            {/* TDS/TCS and Reverse Charge Section */}
            <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-6">
                <RadioGroup value={formData.taxType} onValueChange={(value) => setFormData({ ...formData, taxType: value })} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TDS" id="tds" className="border-blue-600 text-blue-600" />
                    <Label htmlFor="tds" className="cursor-pointer font-medium text-sm">TDS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TCS" id="tcs" className="border-blue-600 text-blue-600" />
                    <Label htmlFor="tcs" className="cursor-pointer font-medium text-sm">TCS</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reverseCharge"
                  checked={formData.reverseCharge}
                  onCheckedChange={(checked) => setFormData({ ...formData, reverseCharge: checked as boolean })}
                />
                <Label htmlFor="reverseCharge" className="text-sm cursor-pointer">
                  This transaction is applicable for reverse charge
                </Label>
              </div>
            </div>

            {/* Item Table Section */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {/* Table Header Controls */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <RadioGroup defaultValue="item" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="item" id="item-level" className="border-blue-600 text-blue-600" />
                      <Label htmlFor="item-level" className="cursor-pointer text-sm">At Transaction Level</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Item Table */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">Item Table</h3>
                  <Button variant="link" className="text-blue-600 text-sm p-0 h-auto">
                    Bulk Actions
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[40px_1fr_140px_80px_80px_120px_100px_40px] bg-blue-600 text-white text-sm font-medium">
                    <div className="p-2 text-center">#</div>
                    <div className="p-2">ITEM DETAILS</div>
                    <div className="p-2">ACCOUNT</div>
                    <div className="p-2 text-center">QUANTITY</div>
                    <div className="p-2 text-right">RATE</div>
                    <div className="p-2">TAX</div>
                    <div className="p-2 text-right">AMOUNT</div>
                    <div className="p-2"></div>
                  </div>

                  {/* Table Rows */}
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[40px_1fr_140px_80px_80px_120px_100px_40px] border-t border-slate-200 items-center">
                      <div className="p-2 text-center text-slate-500">{index + 1}</div>
                      <div className="p-2">
                        <Select
                          value={item.itemId}
                          onValueChange={(value) => selectItem(item.id, value)}
                        >
                          <SelectTrigger className="border-0 shadow-none h-8 text-sm" data-testid={`select-item-${index}`}>
                            <SelectValue placeholder="Type or click to select an item." />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map(i => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-2">
                        <AccountSelectDropdown
                          value={item.account}
                          onValueChange={(value) => updateLineItem(item.id, 'account', value)}
                          placeholder="Select an account"
                          triggerClassName="border-0 shadow-none h-8 text-sm"
                          testId={`select-account-${index}`}
                        />
                      </div>
                      <div className="p-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="text-center h-8 text-sm"
                          data-testid={`input-quantity-${index}`}
                        />
                      </div>
                      <div className="p-2">
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="text-right h-8 text-sm"
                          data-testid={`input-rate-${index}`}
                        />
                      </div>
                      <div className="p-2">
                        <Select
                          value={item.tax}
                          onValueChange={(value) => updateLineItem(item.id, 'tax', value)}
                        >
                          <SelectTrigger className="border-0 shadow-none h-8 text-sm" data-testid={`select-tax-${index}`}>
                            <SelectValue placeholder="Select a Tax" />
                          </SelectTrigger>
                          <SelectContent>
                            {TAX_OPTIONS.map(tax => (
                              <SelectItem key={tax.value} value={tax.value}>{tax.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-2 text-right font-medium text-sm">
                        {item.amount.toFixed(2)}
                      </div>
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 h-6 w-6"
                          onClick={() => removeLineItem(item.id)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Row Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600"
                    onClick={addLineItem}
                    data-testid="button-add-row"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add New Row
                  </Button>
                  <Button variant="outline" size="sm" className="text-blue-600 border-blue-600">
                    <Plus className="h-4 w-4 mr-1" /> Add Items in Bulk
                  </Button>
                </div>
              </div>

              {/* Summary Section */}
              <div className="grid grid-cols-2 gap-8 p-4 border-t border-slate-200">
                <div></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Sub Total</span>
                    <span className="font-medium">{calculateSubTotal().toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 w-24">Discount</span>
                    <Input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-16 text-center h-8 text-sm"
                      data-testid="input-discount"
                    />
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) => setFormData({ ...formData, discountType: value })}
                    >
                      <SelectTrigger className="w-14 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="flat">Rs.</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="ml-auto text-red-500">-{calculateDiscount().toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <RadioGroup
                      value={formData.taxType}
                      onValueChange={(value) => setFormData({ ...formData, taxType: value })}
                      className="flex gap-3"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="TDS" id="tds" className="h-3.5 w-3.5" />
                        <Label htmlFor="tds" className="text-sm">TDS</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="TCS" id="tcs" className="h-3.5 w-3.5" />
                        <Label htmlFor="tcs" className="text-sm">TCS</Label>
                      </div>
                    </RadioGroup>
                    <Select
                      value={formData.taxCategory}
                      onValueChange={(value) => setFormData({ ...formData, taxCategory: value })}
                    >
                      <SelectTrigger className="flex-1 h-8">
                        <SelectValue placeholder="Select a Tax" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Tax</SelectItem>
                        <SelectItem value="tds194c">194C - 1%</SelectItem>
                        <SelectItem value="tds194j">194J - 10%</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-red-500">-0.00</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 w-24">Adjustment</span>
                    <Input
                      type="number"
                      value={formData.adjustment}
                      onChange={(e) => setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })}
                      className="w-20 text-right h-8 text-sm"
                      data-testid="input-adjustment"
                    />
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add any adjustments to the total</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="ml-auto">{formData.adjustment.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="font-semibold text-lg">{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
              <Label>Notes</Label>
              <Textarea
                placeholder="Will be displayed on purchase order"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white min-h-[80px]"
                data-testid="input-notes"
              />
            </div>

            {/* Terms & Conditions and File Upload */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-semibold">Terms & Conditions</Label>
                <Textarea
                  placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                  value={formData.termsAndConditions}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  className="bg-white min-h-[100px]"
                  data-testid="input-terms"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Attach File(s) to Purchase Order</Label>
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" /> Upload File
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">
                    You can upload a maximum of 10 files, 10MB each
                  </p>
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 text-sm text-slate-600">
                      {uploadedFiles.length} file(s) selected
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Fields Info */}
            <div className="text-sm text-slate-500">
              <span className="font-medium text-blue-600">Additional Fields:</span> Start adding custom fields for your purchase orders by going to Settings - Purchases - Purchase Orders.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              data-testid="button-save-draft"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-save-send"
            >
              {loading ? "Saving..." : "Save and Send"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLocation('/purchase-orders')}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
          <div className="text-sm text-slate-500">
            PDF Template: <span className="text-blue-600 cursor-pointer">Standard Template</span>
          </div>
        </div>

        {/* Address Modals */}
        <VendorAddressModal
          open={billingAddressModalOpen}
          onClose={() => setBillingAddressModalOpen(false)}
          onSave={handleBillingAddressUpdate}
          title="Billing Address"
          initialAddress={formData.vendorBillingAddress}
        />

        <VendorAddressModal
          open={shippingAddressModalOpen}
          onClose={() => setShippingAddressModalOpen(false)}
          onSave={handleShippingAddressUpdate}
          title="Shipping Address"
          initialAddress={formData.vendorShippingAddress}
        />
      </div>
    </div>
  );
}
