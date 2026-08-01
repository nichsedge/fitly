'use client';

import React from 'react';
import {
  Shirt,
  Footprints,
  Watch,
  ShoppingBag,
  Layers,
  Shield,
  Home,
  Building2,
  Briefcase,
  Luggage,
  Car,
  Package,
  Warehouse,
  MapPin,
  Sparkles,
  WashingMachine,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  PlusCircle,
  MoreHorizontal,
  Search,
  Grid,
  List,
  Tag,
  Camera,
  CheckCircle2,
  Trash2,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Wand2,
  Edit,
  RefreshCw,
  Globe,
  Download,
  Upload,
  AlertTriangle,
  Database,
  Sun,
  Moon,
  Zap
} from 'lucide-react';
import { Category } from '../lib/types';


export function CategoryIcon({ category, size = 18, className = '' }: { category: Category; size?: number; className?: string }) {
  switch (category) {
    case 'top':
      return <Shirt size={size} className={className} />;
    case 'bottom':
      return <Layers size={size} className={className} />;
    case 'underwear':
      return <Shield size={size} className={className} />;
    case 'shoes':
      return <Footprints size={size} className={className} />;
    case 'outerwear':
      return <Shirt size={size} className={className} style={{ strokeWidth: 2.5 }} />;
    case 'accessory':
      return <Watch size={size} className={className} />;
    case 'bag':
      return <ShoppingBag size={size} className={className} />;
    default:
      return <Shirt size={size} className={className} />;
  }
}

export function LocationIcon({ icon, size = 18, className = '' }: { icon?: string | null; size?: number; className?: string }) {
  switch (icon) {
    case 'home':
    case '🏠':
      return <Home size={size} className={className} />;
    case 'building':
    case 'building-2':
    case '🏢':
      return <Building2 size={size} className={className} />;
    case 'briefcase':
    case '💼':
      return <Briefcase size={size} className={className} />;
    case 'luggage':
    case '🧳':
      return <Luggage size={size} className={className} />;
    case 'car':
    case '🚗':
      return <Car size={size} className={className} />;
    case 'package':
    case '📦':
      return <Package size={size} className={className} />;
    case 'warehouse':
    case '🏪':
      return <Warehouse size={size} className={className} />;
    case 'map-pin':
    case '📍':
    default:
      return <MapPin size={size} className={className} />;
  }
}

export const PRESET_LOCATION_ICONS = [
  { value: 'map-pin', label: 'Pin', icon: MapPin },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'building-2', label: 'Rent/Apartment', icon: Building2 },
  { value: 'briefcase', label: 'Work', icon: Briefcase },
  { value: 'luggage', label: 'Travel', icon: Luggage },
  { value: 'car', label: 'Car', icon: Car },
  { value: 'package', label: 'Storage', icon: Package },
  { value: 'warehouse', label: 'Warehouse', icon: Warehouse },
];

export {
  Shirt,
  Footprints,
  Watch,
  ShoppingBag,
  Layers,
  Shield,
  Home,
  Building2,
  Briefcase,
  Luggage,
  Car,
  Package,
  Warehouse,
  MapPin,
  Sparkles,
  WashingMachine,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  PlusCircle,
  MoreHorizontal,
  Search,
  Grid,
  List,
  Tag,
  Camera,
  CheckCircle2,
  Trash2,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Wand2,
  Edit,
  RefreshCw,
  Globe,
  Download,
  Upload,
  AlertTriangle,
  Database,
  Sun,
  Moon,
  Zap
};
