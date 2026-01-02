import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalItems === 0) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-4 border-t border-border bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30" data-testid="pagination-container">
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-border/60 bg-white dark:bg-slate-800 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          data-testid="pagination-first"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-border/60 bg-white dark:bg-slate-800 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          data-testid="pagination-prev"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1 px-2">
          {getPageNumbers().map((page, index) => (
            typeof page === "number" ? (
              <Button
                key={index}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={`h-9 w-9 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === page 
                    ? "bg-primary text-primary-foreground shadow-md scale-105" 
                    : "border-border/60 bg-white dark:bg-slate-800 hover:bg-primary/10 hover:border-primary/50"
                }`}
                onClick={() => onPageChange(page)}
                data-testid={`pagination-page-${page}`}
              >
                {page}
              </Button>
            ) : (
              <span key={index} className="px-1 text-muted-foreground select-none">...</span>
            )
          ))}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-border/60 bg-white dark:bg-slate-800 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          data-testid="pagination-next"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-border/60 bg-white dark:bg-slate-800 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          data-testid="pagination-last"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-sm text-muted-foreground" data-testid="pagination-info">
        Showing <span className="font-medium text-foreground">{startItem}</span> to <span className="font-medium text-foreground">{endItem}</span> of <span className="font-medium text-foreground">{totalItems}</span> entries
      </div>
    </div>
  );
}
