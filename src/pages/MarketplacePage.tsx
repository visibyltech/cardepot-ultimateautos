import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Car, Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VehicleCard } from '../components/VehicleCard';
import { SeoHead } from '../components/SeoHead';

type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'year_desc' | 'popular';

export function MarketplacePage() {
  const { vehicles, vehiclesLoading } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [make, setMake] = useState(searchParams.get('make') || '');
  const [model, setModel] = useState(searchParams.get('model') || '');
  const [minYear, setMinYear] = useState(searchParams.get('minYear') || '');
  const [maxYear, setMaxYear] = useState(searchParams.get('maxYear') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [transmission, setTransmission] = useState(searchParams.get('transmission') || '');
  const [fuelType, setFuelType] = useState(searchParams.get('fuelType') || '');
  const [bodyType, setBodyType] = useState(searchParams.get('bodyType') || '');
  const [maxMileage, setMaxMileage] = useState(searchParams.get('maxMileage') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [financingOnly, setFinancingOnly] = useState(searchParams.get('financing') === '1');
  const [featuredOnly, setFeaturedOnly] = useState(searchParams.get('featured') === '1');
  const [reducedOnly, setReducedOnly] = useState(searchParams.get('reduced') === '1');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setQueryText(searchParams.get('q') || '');
    setMake(searchParams.get('make') || '');
    setBodyType(searchParams.get('bodyType') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setFinancingOnly(searchParams.get('financing') === '1');
    setFeaturedOnly(searchParams.get('featured') === '1');
    setReducedOnly(searchParams.get('reduced') === '1');
  }, [searchParams]);

  const uniqueMakes = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.make).filter(Boolean))).sort(),
    [vehicles]
  );

  const uniqueLocations = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.location).filter(Boolean))).sort(),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const list = vehicles.filter((v) => {
      if (v.status === 'sold') return false;
      if (q) {
        const hay = `${v.name} ${v.make} ${v.model} ${v.year} ${v.location} ${v.condition} ${v.bodyType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (make && v.make.toLowerCase() !== make.toLowerCase()) return false;
      if (model && !v.model.toLowerCase().includes(model.toLowerCase())) return false;
      if (minYear && v.year < Number(minYear)) return false;
      if (maxYear && v.year > Number(maxYear)) return false;
      if (minPrice && v.priceNgn < Number(minPrice)) return false;
      if (maxPrice && v.priceNgn > Number(maxPrice)) return false;
      if (condition && v.condition !== condition) return false;
      if (transmission && v.transmission !== transmission) return false;
      if (fuelType && v.fuelType !== fuelType) return false;
      if (bodyType && v.bodyType !== bodyType) return false;
      if (maxMileage && v.mileageKm > Number(maxMileage)) return false;
      if (locationFilter && !v.location.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
      if (financingOnly && !v.financingAvailable) return false;
      if (featuredOnly && !v.featured) return false;
      if (reducedOnly && !(typeof v.previousPriceNgn === 'number' && v.previousPriceNgn > v.priceNgn)) {
        return false;
      }
      return true;
    });

    const sorted = [...list];
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => a.priceNgn - b.priceNgn);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.priceNgn - a.priceNgn);
        break;
      case 'year_desc':
        sorted.sort((a, b) => b.year - a.year);
        break;
      case 'popular':
        sorted.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
        break;
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
  }, [
    vehicles,
    queryText,
    make,
    model,
    minYear,
    maxYear,
    minPrice,
    maxPrice,
    condition,
    transmission,
    fuelType,
    bodyType,
    maxMileage,
    locationFilter,
    financingOnly,
    featuredOnly,
    reducedOnly,
    sortBy,
  ]);

  const resetFilters = () => {
    setQueryText('');
    setMake('');
    setModel('');
    setMinYear('');
    setMaxYear('');
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setTransmission('');
    setFuelType('');
    setBodyType('');
    setMaxMileage('');
    setLocationFilter('');
    setFinancingOnly(false);
    setFeaturedOnly(false);
    setReducedOnly(false);
    setSearchParams({});
  };

  const FilterFields = () => (
    <div className="space-y-4 text-sm">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Make / Brand</label>
        <select
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
        >
          <option value="">All Makes</option>
          {uniqueMakes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. Camry, RX 350"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Year Range</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={minYear}
            onChange={(e) => setMinYear(e.target.value)}
            placeholder="Min Year"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono-num"
          />
          <input
            type="number"
            value={maxYear}
            onChange={(e) => setMaxYear(e.target.value)}
            placeholder="Max Year"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono-num"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Price Range (₦)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min ₦"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono-num"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max ₦"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono-num"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
        >
          <option value="">Any Condition</option>
          <option value="Foreign Used">Foreign Used</option>
          <option value="Nigerian Used">Nigerian Used</option>
          <option value="Brand New">Brand New</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Body Type</label>
        <select
          value={bodyType}
          onChange={(e) => setBodyType(e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
        >
          <option value="">All Body Types</option>
          {['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Pickup', 'Bus', 'Convertible', 'Wagon'].map(
            (b) => (
              <option key={b} value={b}>
                {b}
              </option>
            )
          )}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Transmission</label>
          <select
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
            className="w-full px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Any</option>
            <option value="Automatic">Automatic</option>
            <option value="Manual">Manual</option>
            <option value="CVT">CVT</option>
            <option value="Semi-Automatic">Semi-Auto</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel Type</label>
          <select
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            className="w-full px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Any</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Electric">Electric</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Max Mileage (km)</label>
        <input
          type="number"
          value={maxMileage}
          onChange={(e) => setMaxMileage(e.target.value)}
          placeholder="e.g. 120000"
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono-num"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
        <input
          type="text"
          list="vehicle-locations"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="e.g. Lekki, Ikeja, Abuja"
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
        />
        <datalist id="vehicle-locations">
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>
      </div>

      <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={financingOnly}
          onChange={(e) => setFinancingOnly(e.target.checked)}
          className="w-4 h-4 accent-red-600 rounded"
        />
        <span className="text-xs font-medium text-slate-800">
          Buy Now Pay Later Eligible Only
        </span>
      </label>

      <button
        type="button"
        onClick={resetFilters}
        className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset All Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8">
      <SeoHead
        title="Cars for Sale in Lagos & Nigeria | Car Depot by Ultimate Autos"
        description="Search verified Foreign Used and Nigerian Used cars in Lagos. Filter by make, model, year, price in Naira, transmission, mileage, and financing availability."
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Top Marketplace Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-900">
                Vehicle Marketplace
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                <span className="font-mono-num font-semibold text-slate-900">
                  {filteredVehicles.length}
                </span>{' '}
                verified listing{filteredVehicles.length === 1 ? '' : 's'} available
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Keyword search..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort vehicles"
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="recent">Recently Added</option>
                <option value="price_asc">Lowest Price</option>
                <option value="price_desc">Highest Price</option>
                <option value="year_desc">Newest Model</option>
                <option value="popular">Most Popular</option>
              </select>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Layout: Desktop Filter Sidebar + Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="hidden lg:block lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Filter className="w-4 h-4 text-red-600" />
              <h2 className="font-display font-bold text-base text-slate-900">Filter Vehicles</h2>
            </div>
            {FilterFields()}
          </aside>

          <main className="lg:col-span-9">
            {vehiclesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center">
                <Car className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h2 className="font-display font-bold text-lg text-slate-900 mb-2">
                  No Matching Vehicles Found
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                  No currently published vehicles match your selected filters. Reset your filters or request a custom Car Quotation and our Lagos sourcing team will find it for you.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl"
                  >
                    Clear Filters
                  </button>
                  <Link
                    to="/request-car"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
                  >
                    Request a Car Quotation
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {filteredVehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/60 flex justify-end">
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display font-bold text-lg text-slate-900">Filter Vehicles</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {FilterFields()}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-3 bg-red-600 text-white text-sm font-semibold rounded-xl"
            >
              Show {filteredVehicles.length} Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
