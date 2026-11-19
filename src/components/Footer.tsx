import { Link } from 'react-router-dom';
import { Phone, MessageCircle, MapPin, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildWhatsAppClickToChatUrl, OFFICIAL_LOGO_PATH } from '../lib/format';

export function Footer() {
  const { settings } = useApp();
  const whatsappUrl = buildWhatsAppClickToChatUrl(
    'Hello Car Depot by Ultimate Autos, I would like to speak with your sales team.',
    settings.whatsappNumber
  );

  return (
    <footer className="bg-[#0B0D10] text-slate-300 border-t border-slate-800 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <img
              src={OFFICIAL_LOGO_PATH}
              alt="Car Depot by Ultimate Autos"
              className="h-14 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <h3 className="font-display font-bold text-white text-base">
                {settings.businessName}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{settings.publicListingTitle}</p>
              <p className="text-xs font-semibold text-red-500 mt-2">{settings.tagline}</p>
            </div>
          </div>

          {/* Marketplace & Services */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm mb-4">
              Marketplace &amp; Services
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/cars" className="hover:text-white transition-colors">
                  Browse Vehicles
                </Link>
              </li>
              <li>
                <Link to="/financing" className="hover:text-white transition-colors">
                  Buy Now Pay Later Financing
                </Link>
              </li>
              <li>
                <Link to="/save-to-own" className="hover:text-white transition-colors">
                  Save to Own (Pay Small Small)
                </Link>
              </li>
              <li>
                <Link to="/sell-your-car" className="hover:text-white transition-colors">
                  Sell Your Car / Valuation
                </Link>
              </li>
              <li>
                <Link to="/request-car" className="hover:text-white transition-colors">
                  Request a Car Quotation
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Trust */}
          <div>
            <h4 className="font-display font-semibold text-white text-sm mb-4">
              Policies &amp; Support
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact &amp; Customer Support
                </Link>
              </li>
              <li>
                <Link to="/policies/financing-terms" className="hover:text-white transition-colors">
                  Financing Terms
                </Link>
              </li>
              <li>
                <Link to="/policies/save-to-own-terms" className="hover:text-white transition-colors">
                  Save to Own Terms
                </Link>
              </li>
              <li>
                <Link to="/policies/purchase-policy" className="hover:text-white transition-colors">
                  Vehicle Purchase &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/policies/privacy" className="hover:text-white transition-colors">
                  Privacy Policy &amp; Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-white text-sm mb-4">
              Dealership Contact
            </h4>
            <div className="flex items-start gap-2.5 text-sm">
              <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-slate-300">{settings.address}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <a
                href={`tel:${settings.phoneNumber.replace(/\s+/g, '')}`}
                className="font-mono-num hover:text-white transition-colors"
              >
                {settings.phoneNumber}
              </a>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-slate-400">{settings.businessHours}</span>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp ({settings.whatsappNumber})
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
          </p>
          <p>{settings.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
