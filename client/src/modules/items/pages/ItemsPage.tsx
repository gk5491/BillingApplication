import { useState, useEffect, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { Plus, MoreHorizontal, ChevronDown, ArrowUpDown, Import, Download, Settings, RefreshCw, RotateCcw, FileText, CheckSquare, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
import ItemDetailPanel from "../components/ItemDetailPanel";

interface Item {
  id: string;
  name: string;
  purchaseDescription: string;
  purchaseRate: string;
  description: string;
  rate: string;
  hsnSac: string;
  usageUnit: string;
  type?: string;
  createdSource?: string;
  taxPreference?: string;
  intraStateTax?: string;
  interStateTax?: string;
  purchaseAccount?: string;
  salesAccount?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function ItemsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(i => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
  };

  const handleClosePanel = () => {
    setSelectedItem(null);
  };

  const handleEditItem = () => {
    if (selectedItem) {
      setLocation(`/items/${selectedItem.id}/edit`);
    }
  };

  const handleCloneItem = async (item: Item) => {
    try {
      const response = await fetch(`/api/items/${item.id}/clone`, {
        method: 'POST',
      });
      if (response.ok) {
        toast({
          title: "Item Cloned",
          description: `"${item.name}" has been cloned successfully.`,
        });
        setSelectedItem(null);
        fetchItems();
      } else {
        throw new Error("Failed to clone item");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clone item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (item: Item) => {
    try {
      const newStatus = item.isActive === false ? true : false;
      const response = await fetch(`/api/items/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (response.ok) {
        const updatedItem = await response.json();
        toast({
          title: newStatus ? "Item Activated" : "Item Deactivated",
          description: `"${item.name}" has been marked as ${newStatus ? "active" : "inactive"}.`,
        });
        setSelectedItem(updatedItem);
        fetchItems();
      } else {
        throw new Error("Failed to update item status");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const response = await fetch(`/api/items/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast({
          title: "Item Deleted",
          description: `"${itemToDelete.name}" has been deleted.`,
        });
        setSelectedItem(null);
        setShowDeleteDialog(false);
        setItemToDelete(null);
        fetchItems();
      } else {
        throw new Error("Failed to delete item");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] animate-in fade-in duration-300">
      <div className={`flex-1 flex flex-col overflow-hidden ${selectedItem ? 'border-r border-slate-200' : ''}`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">All Items</h1>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setLocation("/items/create")} 
              className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-9"
            >
              <Plus className="h-4 w-4" /> New
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort by
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Name</DropdownMenuItem>
                    <DropdownMenuItem>Purchase Rate</DropdownMenuItem>
                    <DropdownMenuItem>Rate</DropdownMenuItem>
                    <DropdownMenuItem>HSN/SAC</DropdownMenuItem>
                    <DropdownMenuItem>Last Modified Time</DropdownMenuItem>
                    <DropdownMenuItem>Created Time</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem>
                  <Import className="mr-2 h-4 w-4" />
                  Import Items
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem>Export as Excel</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem onClick={fetchItems}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh List
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Column Width
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Update New GST Rates
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Validate HSN/SAC
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <History className="mr-2 h-4 w-4" />
                  HSN/SAC Update History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-auto border-t border-slate-200">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p>No items found.</p>
              <Button 
                onClick={() => setLocation("/items/create")} 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Create your first item
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox 
                      checked={selectedItems.length === items.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    NAME 
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    PURCHASE DESCRIPTION
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    PURCHASE RATE
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    DESCRIPTION
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    RATE
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    HSN/SAC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    USAGE UNIT
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {items.map((item) => (
                  <tr 
                    key={item.id}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <td className="px-4 py-3">
                      <Checkbox 
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => {}}
                        onClick={(e) => toggleSelectItem(item.id, e as MouseEvent)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        {item.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600">
                        {item.purchaseDescription || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">
                        {item.purchaseRate ? `₹${item.purchaseRate}` : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600">
                        {item.description || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">
                        {item.rate ? `₹${item.rate}` : '₹0.00'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">
                        {item.hsnSac || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600">
                        {item.usageUnit || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedItem && (
        <div className="w-[600px] flex-shrink-0 overflow-hidden">
          <ItemDetailPanel 
            item={selectedItem} 
            onClose={handleClosePanel}
            onEdit={handleEditItem}
            onClone={handleCloneItem}
            onToggleActive={handleToggleActive}
            onDelete={handleDeleteItem}
          />
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
