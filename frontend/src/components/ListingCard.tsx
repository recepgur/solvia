import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { MapPin } from "lucide-react";
import { Listing, ItemCondition } from "@/types";
import { Badge } from "./ui/badge";

interface ListingCardProps {
  listing: Listing;
  onSwipe: (direction: 'left' | 'right') => void;
}

export function ListingCard({ listing, onSwipe }: ListingCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: Event, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute w-full"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="relative">
          <img 
            src={listing.image_urls[0]} 
            alt={listing.title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Badge variant={listing.condition === ItemCondition.NEW ? "success" : "warning"}>
              {listing.condition === ItemCondition.NEW ? 'NEW' : 'USED'}
            </Badge>
            <Badge variant="secondary">
              {listing.category.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h2 className="text-2xl font-bold text-white">{listing.title}</h2>
            <p className="text-xl text-white">${listing.price.toLocaleString()}</p>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={20} />
            <span>Location: {listing.location.latitude.toFixed(2)}, {listing.location.longitude.toFixed(2)}</span>
          </div>
          <p className="text-gray-700">{listing.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
