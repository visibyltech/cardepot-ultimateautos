import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Car, Heart, MapPin } from 'lucide-react';
import { Vehicle } from '../types';
import { formatNaira, formatNumber } from '../lib/format';
import { useApp } from '../context/AppContext';

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const { isInWishlist, toggleWishlist } = useApp();
  const saved = isInWishlist(vehicle.id);
  const coverImage = vehicle.images?.[0];
  const hasPriceDrop =
    typeof vehicle.previousPriceNgn === 'number' && vehicle.previousPriceNgn > vehicle.priceNgn;

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(vehicle);
  };

  return (
    <Link
      to={`/cars/${vehicle.slug}`}
      className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200"
    >
      {/* Vehicle Image */}
      <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${vehicle.year} ${vehicle.name}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-400 p-4">
            <Car className="w-10 h-10 mb-2 text-slate-500" />
            <span className="text-xs font-medium text-center text-slate-400">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </span>
          </div>
        )}

        {/* Sold / Reserved Overlay */}
        {vehicle.status !== 'available' && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="px-3 py-1 bg-red-600 text-white text-xs font-semibold uppercase tracking-wider rounded">
              {vehicle.status}
            </span>
          </div>
        )}

        {/* Wishlist Action */}
        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`absolute top-2 right-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
            saved
              ? 'bg-red-600 text-white'
              : 'bg-black/50 text-white hover:bg-black/75'
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-display font-semibold text-sm sm:text-base text-slate-900 line-clamp-2 leading-snug">
              {vehicle.year} {vehicle.name}
            </h3>
            {vehicle.verified && (
              <BadgeCheck
                className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                aria-label="Verified Dealership Listing"
              />
            )}
          </div>

          <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
            <span className="font-mono-num font-bold text-base sm:text-lg text-red-600">
              {formatNaira(vehicle.priceNgn)}
            </span>
            {hasPriceDrop && (
              <span className="font-mono-num text-xs text-slate-400 line-through">
                {formatNaira(vehicle.previousPriceNgn)}
              </span>
            )}
          </div>
        </div>

        {/* Clean Unboxed Metadata */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <p className="text-[11px] sm:text-xs text-slate-600 truncate">
            {vehicle.condition} · {vehicle.transmission} · {vehicle.fuelType}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{vehicle.location}</span>
            </span>
            <span className="font-mono-num shrink-0">
              {formatNumber(vehicle.mileageKm)} km
            </span>
          </div>
          {(vehicle.financingAvailable || vehicle.saveToOwnAvailable) && (
            <p className="text-[11px] font-medium text-slate-700 truncate">
              {[
                vehicle.financingAvailable ? 'Financing' : null,
                vehicle.saveToOwnAvailable ? 'Save to Own' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
