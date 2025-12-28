import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

interface TemplateFiltersProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    tabs: string[];
    sortBy: "date" | "name";
    setSortBy: (sortBy: "date" | "name") => void;
    sortOrder: "asc" | "desc";
    setSortOrder: (sortOrder: "asc" | "desc") => void;
}

export default function TemplateFilters({
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    tabs,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
}: TemplateFiltersProps) {
    const toggleSortOrder = () => {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    };

    return (
        <div className="pb-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-md">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab
                                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                        placeholder="Search templates..."
                        className="pl-9 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value: "date" | "name") => setSortBy(value)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">Date Created</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button 
                        variant="outline" 
                        size="icon"
                        onClick={toggleSortOrder}
                        title={sortOrder === "asc" ? "Ascending" : "Descending"}
                    >
                        <ArrowUpDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
