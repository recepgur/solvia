import { Category } from "@/types";
import { Button } from "./ui/button";

interface CategoryFilterProps {
  selectedCategory: Category | 'all';
  onSelect: (category: Category | 'all') => void;
}

export function CategoryFilter({ selectedCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-white shadow-sm rounded-lg mb-4">
      <Button
        variant={selectedCategory === 'all' ? 'default' : 'outline'}
        onClick={() => onSelect('all')}
      >
        All
      </Button>
      {Object.values(Category).map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? 'default' : 'outline'}
          onClick={() => onSelect(category)}
        >
          {category.replace('_', ' ').toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
