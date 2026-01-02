import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { X, Check, ChevronsUpDown, Search, HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Unit {
  id: string;
  name: string;
  uqc: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  label: string;
}

const itemSchema = z.object({
  type: z.enum(["goods", "service"]),
  name: z.string().min(1, "Item Name is required"),
  unit: z.string().optional(),
  hsnSac: z.string().optional(),
  taxPreference: z.string().default("taxable"),
  exemptionReason: z.string().optional(),
  sellable: z.boolean().default(true),
  sellingPrice: z.string().optional(),
  salesAccount: z.string().default("sales"),
  salesDescription: z.string().optional(),
  purchasable: z.boolean().default(true),
  costPrice: z.string().optional(),
  purchaseAccount: z.string().default("cost_of_goods"),
  purchaseDescription: z.string().optional(),
  preferredVendor: z.string().optional(),
  intraStateTaxRate: z.string().default("gst18"),
  interStateTaxRate: z.string().default("igst18"),
});

type ItemFormValues = z.infer<typeof itemSchema>;

const taxPreferences = [
  { label: "Taxable", value: "taxable" },
  { label: "Non-Taxable", value: "non_taxable" },
  { label: "Out of Scope", value: "out_of_scope" },
  { label: "Non-GST Supply", value: "non_gst" },
];

const exemptionReasons = [
  { label: "Exempt under section 10", value: "section_10" },
  { label: "Exempt under section 11", value: "section_11" },
  { label: "Exempt supply under notification", value: "notification" },
  { label: "Other exemption", value: "other" },
];

// Hierarchical account structure - matches New Item exactly
const ACCOUNT_HIERARCHY = [
  {
    category: "Other Current Asset",
    accounts: [
      { label: "Advance Tax", value: "advance_tax" },
      { label: "Employee Advance", value: "employee_advance" },
      { label: "Input Tax Credits", value: "input_tax_credits", children: [
        { label: "Input CGST", value: "input_cgst" },
        { label: "Input IGST", value: "input_igst" },
        { label: "Input SGST", value: "input_sgst" },
      ]},
      { label: "Prepaid Expenses", value: "prepaid_expenses" },
      { label: "Reverse Charge Tax Input but not due", value: "reverse_charge_input" },
      { label: "TDS Receivable", value: "tds_receivable" },
    ]
  },
  {
    category: "Fixed Asset",
    accounts: [
      { label: "Furniture and Equipment", value: "furniture_equipment" },
    ]
  },
  {
    category: "Other Current Liability",
    accounts: [
      { label: "Employee Reimbursements", value: "employee_reimbursements" },
      { label: "GST Payable", value: "gst_payable", children: [
        { label: "Output CGST", value: "output_cgst" },
        { label: "Output IGST", value: "output_igst" },
        { label: "Output SGST", value: "output_sgst" },
      ]},
      { label: "Opening Balance Adjustments", value: "opening_balance_adjustments" },
      { label: "Tax Payable", value: "tax_payable" },
      { label: "TDS Payable", value: "tds_payable" },
      { label: "Unearned Revenue", value: "unearned_revenue" },
    ]
  },
  {
    category: "Income",
    accounts: [
      { label: "Discount", value: "discount" },
      { label: "General Income", value: "general_income" },
      { label: "Interest Income", value: "interest_income" },
      { label: "Late Fee Income", value: "late_fee_income" },
      { label: "Other Charges", value: "other_charges" },
      { label: "Sales", value: "sales" },
      { label: "Shipping Charge", value: "shipping_charge" },
    ]
  },
  {
    category: "Cost of Goods Sold",
    accounts: [
      { label: "Cost of Goods Sold", value: "cost_of_goods" },
      { label: "Job Costing", value: "job_costing" },
      { label: "Materials", value: "materials" },
      { label: "Subcontractor", value: "subcontractor" },
    ]
  },
  {
    category: "Expense",
    accounts: [
      { label: "Advertising And Marketing", value: "advertising_marketing" },
      { label: "Automobile Expense", value: "automobile_expense" },
      { label: "Bank Fees and Charges", value: "bank_fees" },
      { label: "Consultant Expense", value: "consultant_expense" },
      { label: "Office Supplies", value: "office_supplies" },
      { label: "Rent Expense", value: "rent_expense" },
      { label: "Travel Expense", value: "travel_expense" },
    ]
  }
];

// Flatten accounts for search
const flattenAccounts = () => {
  const flat: { label: string; value: string; category: string; indent: number }[] = [];
  ACCOUNT_HIERARCHY.forEach(cat => {
    cat.accounts.forEach(acc => {
      flat.push({ label: acc.label, value: acc.value, category: cat.category, indent: 0 });
      if ('children' in acc && acc.children) {
        acc.children.forEach((child: any) => {
          flat.push({ label: child.label, value: child.value, category: cat.category, indent: 1 });
        });
      }
    });
  });
  return flat;
};

const ALL_ACCOUNTS = flattenAccounts();

export default function ProductEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/items/:id/edit");
  const { toast } = useToast();
  const [unitOpen, setUnitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salesAccountOpen, setSalesAccountOpen] = useState(false);
  const [purchaseAccountOpen, setPurchaseAccountOpen] = useState(false);
  const [intraStateTaxOpen, setIntraStateTaxOpen] = useState(false);
  const [interStateTaxOpen, setInterStateTaxOpen] = useState(false);
  const [vendors, setVendors] = useState<{ label: string; value: string }[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Fetch units from API
  const { data: unitsData } = useQuery<{ success: boolean; data: Unit[] }>({
    queryKey: ['/api/units'],
  });
  const units = unitsData?.data || [];

  // Fetch tax rates from API
  const { data: taxRatesData } = useQuery<{ success: boolean; data: TaxRate[] }>({
    queryKey: ['/api/taxRates'],
  });
  const taxRates = taxRatesData?.data || [];

  // Separate GST and IGST rates
  const gstRates = taxRates.filter(t => t.name.startsWith('GST') || t.name === 'Exempt');
  const igstRates = taxRates.filter(t => t.name.startsWith('IGST') || t.name === 'Exempt');

  // Fetch vendors from API
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch('/api/vendors');
        if (response.ok) {
          const result = await response.json();
          const vendorOptions = result.data.map((vendor: any) => ({
            label: vendor.displayName || vendor.companyName || `${vendor.firstName} ${vendor.lastName}`.trim(),
            value: vendor.id,
          }));
          setVendors(vendorOptions);
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      } finally {
        setVendorsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: "goods",
      name: "",
      taxPreference: "taxable",
      sellable: true,
      purchasable: true,
      salesAccount: "sales",
      purchaseAccount: "cost_of_goods",
      intraStateTaxRate: "GST18",
      interStateTaxRate: "IGST18",
    },
  });

  useEffect(() => {
    if (params?.id) {
      fetchItem(params.id);
    }
  }, [params?.id]);

  const fetchItem = async (id: string) => {
    try {
      const response = await fetch(`/api/items/${id}`);
      if (response.ok) {
        const item = await response.json();
        form.reset({
          type: item.type || "goods",
          name: item.name || "",
          unit: item.usageUnit || "",
          hsnSac: item.hsnSac || "",
          taxPreference: item.taxPreference || "taxable",
          exemptionReason: item.exemptionReason || "",
          sellable: true,
          sellingPrice: item.rate?.replace("₹", "") || "",
          salesAccount: item.salesAccount || "sales",
          salesDescription: item.description || "",
          purchasable: true,
          costPrice: item.purchaseRate?.replace("₹", "") || "",
          purchaseAccount: item.purchaseAccount || "cost_of_goods",
          purchaseDescription: item.purchaseDescription || "",
          preferredVendor: item.preferredVendor || "",
          intraStateTaxRate: item.intraStateTax || "GST18",
          interStateTaxRate: item.interStateTax || "IGST18",
        });
      } else {
        toast({
          title: "Error",
          description: "Item not found",
          variant: "destructive",
        });
        setLocation("/items");
      }
    } catch (error) {
      console.error("Failed to fetch item:", error);
      setLocation("/items");
    } finally {
      setLoading(false);
    }
  };

  const itemType = form.watch("type");
  const taxPreference = form.watch("taxPreference");
  const sellable = form.watch("sellable");
  const purchasable = form.watch("purchasable");

  const onSubmit = async (data: ItemFormValues) => {
    if (!params?.id) return;

    try {
      const itemData = {
        name: data.name,
        type: data.type,
        hsnSac: data.hsnSac || "",
        usageUnit: data.unit || "",
        rate: data.sellingPrice || "0.00",
        purchaseRate: data.costPrice || "0.00",
        description: data.salesDescription || "",
        purchaseDescription: data.purchaseDescription || "",
        taxPreference: data.taxPreference,
        exemptionReason: data.exemptionReason || "",
        intraStateTax: data.intraStateTaxRate,
        interStateTax: data.interStateTaxRate,
        salesAccount: data.salesAccount,
        purchaseAccount: data.purchaseAccount,
        preferredVendor: data.preferredVendor || "",
      };

      const response = await fetch(`/api/items/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/items'] });
        toast({
          title: "Item Updated",
          description: "The item has been successfully updated.",
        });
        setLocation("/items");
      } else {
        throw new Error("Failed to update item");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAccountLabel = (value: string) => {
    const acc = ALL_ACCOUNTS.find(a => a.value === value);
    return acc?.label || value;
  };

  const getTaxRateLabel = (value: string) => {
    const tax = taxRates.find(t => t.name === value);
    return tax?.label || value;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <p className="text-slate-600">Loading item...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/20">
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">Edit Item</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/items")}
            className="h-8 w-8"
            data-testid="button-close-edit"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-8">
                    <div className="text-slate-600 min-w-[100px] flex items-center gap-1 text-sm font-medium">
                      Type
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select whether this is a physical product (Goods) or a service</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="goods" id="goods-edit" className="border-blue-600 text-blue-600" data-testid="radio-goods-edit" />
                          <Label htmlFor="goods-edit" className="font-normal cursor-pointer">Goods</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="service" id="service-edit" className="border-blue-600 text-blue-600" data-testid="radio-service-edit" />
                          <Label htmlFor="service-edit" className="font-normal cursor-pointer">Service</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-[120px_1fr] items-start gap-4">
                    <FormLabel className="text-slate-700 pt-2.5">
                      Name<span className="text-red-600">*</span>
                    </FormLabel>
                    <div>
                      <FormControl>
                        <Input {...field} className="bg-white border-blue-500 focus:border-blue-600" data-testid="input-item-name-edit" />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Unit Dropdown with API data */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-[120px_1fr] items-start gap-4">
                    <div className="text-slate-600 pt-2.5 flex items-center gap-1 text-sm font-medium">
                      Unit
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Select the unit of measurement for this item</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div>
                      <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-normal bg-white",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="select-unit-edit"
                            >
                              {field.value
                                ? units.find((u) => u.name === field.value)
                                  ? `${field.value} (${units.find((u) => u.name === field.value)?.uqc || ''})`
                                  : field.value
                                : "Select unit..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search" />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>No unit found.</CommandEmpty>
                              <CommandGroup>
                                {units.map((unit) => (
                                  <CommandItem
                                    value={`${unit.name} (${unit.uqc})`}
                                    key={unit.id}
                                    onSelect={() => {
                                      form.setValue("unit", unit.name);
                                      setUnitOpen(false);
                                    }}
                                    data-testid={`unit-option-edit-${unit.name}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        unit.name === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {unit.name} ({unit.uqc})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              <CommandSeparator />
                              <CommandGroup>
                                <CommandItem
                                  className="text-blue-600 cursor-pointer"
                                  onSelect={() => {
                                    setUnitOpen(false);
                                  }}
                                  data-testid="button-configure-units-edit"
                                >
                                  <Settings className="mr-2 h-4 w-4" />
                                  Configure Units
                                </CommandItem>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hsnSac"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-[120px_1fr] items-start gap-4">
                    <FormLabel className="text-slate-600 pt-2.5">
                      {itemType === "goods" ? "HSN Code" : "SAC"}
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input {...field} className="bg-white pr-10" data-testid="input-hsn-sac-edit" />
                      </FormControl>
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 cursor-pointer" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxPreference"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-[120px_1fr] items-start gap-4">
                    <FormLabel className="text-slate-700 pt-2.5">
                      Tax Preference<span className="text-red-600">*</span>
                    </FormLabel>
                    <div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white" data-testid="select-tax-preference-edit">
                            <SelectValue placeholder="Select tax preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {taxPreferences.map((pref) => (
                            <SelectItem key={pref.value} value={pref.value}>
                              {pref.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormItem>
                )}
              />

              {taxPreference === "non_gst" && (
                <FormField
                  control={form.control}
                  name="exemptionReason"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-[120px_1fr] items-start gap-4">
                      <div className="text-slate-700 pt-2.5 flex items-center gap-1 text-sm font-medium">
                        Exemption Reason<span className="text-red-600">*</span>
                      </div>
                      <div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select exemption reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {exemptionReasons.map((reason) => (
                              <SelectItem key={reason.value} value={reason.value}>
                                {reason.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {/* Default Tax Rates Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-slate-800 mb-4">Default Tax Rates</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Intra State Tax Dropdown */}
                  <FormField
                    control={form.control}
                    name="intraStateTaxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Intra State Tax</FormLabel>
                        <Popover open={intraStateTaxOpen} onOpenChange={setIntraStateTaxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal bg-white"
                                data-testid="select-intra-state-tax-edit"
                              >
                                {getTaxRateLabel(field.value)}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search tax rates..." />
                              <CommandList>
                                <CommandEmpty>No tax rate found.</CommandEmpty>
                                <CommandGroup>
                                  {gstRates.map((tax) => (
                                    <CommandItem
                                      key={tax.id}
                                      value={tax.label}
                                      onSelect={() => {
                                        form.setValue("intraStateTaxRate", tax.name);
                                        setIntraStateTaxOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          tax.name === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {tax.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />

                  {/* Inter State Tax Dropdown */}
                  <FormField
                    control={form.control}
                    name="interStateTaxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Inter State Tax</FormLabel>
                        <Popover open={interStateTaxOpen} onOpenChange={setInterStateTaxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal bg-white"
                                data-testid="select-inter-state-tax-edit"
                              >
                                {getTaxRateLabel(field.value)}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search tax rates..." />
                              <CommandList>
                                <CommandEmpty>No tax rate found.</CommandEmpty>
                                <CommandGroup>
                                  {igstRates.map((tax) => (
                                    <CommandItem
                                      key={tax.id}
                                      value={tax.label}
                                      onSelect={() => {
                                        form.setValue("interStateTaxRate", tax.name);
                                        setInterStateTaxOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          tax.name === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {tax.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                {/* Sales Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">Sales Information</h3>
                    <FormField
                      control={form.control}
                      name="sellable"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-sellable-edit"
                            />
                          </FormControl>
                          <Label className="font-normal text-sm">Sellable</Label>
                        </FormItem>
                      )}
                    />
                  </div>

                  {sellable && (
                    <>
                      <FormField
                        control={form.control}
                        name="sellingPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">
                              Selling Price<span className="text-red-600">*</span>
                            </FormLabel>
                            <div className="flex">
                              <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-md px-3 py-2 text-sm text-slate-600">INR</span>
                              <FormControl>
                                <Input {...field} className="rounded-l-none bg-white" placeholder="0.00" data-testid="input-selling-price-edit" />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Sales Account - Searchable Hierarchical */}
                      <FormField
                        control={form.control}
                        name="salesAccount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">
                              Account<span className="text-red-600">*</span>
                            </FormLabel>
                            <Popover open={salesAccountOpen} onOpenChange={setSalesAccountOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal bg-white"
                                    data-testid="select-sales-account-edit"
                                  >
                                    {getAccountLabel(field.value)}
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[350px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search accounts..." />
                                  <CommandList className="max-h-[300px] overflow-y-auto">
                                    <CommandEmpty>No account found.</CommandEmpty>
                                    {ACCOUNT_HIERARCHY.map((category) => (
                                      <CommandGroup key={category.category} heading={category.category}>
                                        {category.accounts.map((acc) => (
                                          <div key={acc.value}>
                                            <CommandItem
                                              value={acc.label}
                                              onSelect={() => {
                                                form.setValue("salesAccount", acc.value);
                                                setSalesAccountOpen(false);
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  acc.value === field.value ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {acc.label}
                                            </CommandItem>
                                            {'children' in acc && acc.children && acc.children.map((child: any) => (
                                              <CommandItem
                                                key={child.value}
                                                value={child.label}
                                                onSelect={() => {
                                                  form.setValue("salesAccount", child.value);
                                                  setSalesAccountOpen(false);
                                                }}
                                                className="pl-8"
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    child.value === field.value ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                • {child.label}
                                              </CommandItem>
                                            ))}
                                          </div>
                                        ))}
                                      </CommandGroup>
                                    ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="salesDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600">Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="bg-white min-h-[80px] resize-none" data-testid="textarea-sales-description-edit" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                {/* Purchase Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">Purchase Information</h3>
                    <FormField
                      control={form.control}
                      name="purchasable"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-purchasable-edit"
                            />
                          </FormControl>
                          <Label className="font-normal text-sm">Purchasable</Label>
                        </FormItem>
                      )}
                    />
                  </div>

                  {purchasable && (
                    <>
                      <FormField
                        control={form.control}
                        name="costPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">
                              Cost Price<span className="text-red-600">*</span>
                            </FormLabel>
                            <div className="flex">
                              <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-md px-3 py-2 text-sm text-slate-600">INR</span>
                              <FormControl>
                                <Input {...field} className="rounded-l-none bg-white" placeholder="0.00" data-testid="input-cost-price-edit" />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Purchase Account - Searchable Hierarchical */}
                      <FormField
                        control={form.control}
                        name="purchaseAccount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">
                              Account<span className="text-red-600">*</span>
                            </FormLabel>
                            <Popover open={purchaseAccountOpen} onOpenChange={setPurchaseAccountOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between font-normal bg-white"
                                    data-testid="select-purchase-account-edit"
                                  >
                                    {getAccountLabel(field.value)}
                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[350px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search accounts..." />
                                  <CommandList className="max-h-[300px] overflow-y-auto">
                                    <CommandEmpty>No account found.</CommandEmpty>
                                    {ACCOUNT_HIERARCHY.map((category) => (
                                      <CommandGroup key={category.category} heading={category.category}>
                                        {category.accounts.map((acc) => (
                                          <div key={acc.value}>
                                            <CommandItem
                                              value={acc.label}
                                              onSelect={() => {
                                                form.setValue("purchaseAccount", acc.value);
                                                setPurchaseAccountOpen(false);
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  acc.value === field.value ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {acc.label}
                                            </CommandItem>
                                            {'children' in acc && acc.children && acc.children.map((child: any) => (
                                              <CommandItem
                                                key={child.value}
                                                value={child.label}
                                                onSelect={() => {
                                                  form.setValue("purchaseAccount", child.value);
                                                  setPurchaseAccountOpen(false);
                                                }}
                                                className="pl-8"
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    child.value === field.value ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                • {child.label}
                                              </CommandItem>
                                            ))}
                                          </div>
                                        ))}
                                      </CommandGroup>
                                    ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="purchaseDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600">Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="bg-white min-h-[80px] resize-none" data-testid="textarea-purchase-description-edit" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="preferredVendor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-600">Preferred Vendor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="bg-white" data-testid="select-preferred-vendor-edit">
                                  <SelectValue placeholder={vendorsLoading ? "Loading vendors..." : "Select a vendor"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vendors.map((vendor) => (
                                  <SelectItem key={vendor.value} value={vendor.value}>
                                    {vendor.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/items")}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" data-testid="button-save-item-edit">
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
