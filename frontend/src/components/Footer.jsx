import React from 'react';
import { MapPin, Phone, Mail, Globe, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer id="contact" className="bg-college-navy dark:bg-slate-900 text-slate-300 mt-auto border-t border-slate-800 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-8">
          {/* Left: Address Info */}
          <div className="text-[15px] text-slate-300 leading-relaxed font-sans mt-2">
            <p className="font-semibold text-white">RSET Campus</p>
            <p>S V Road, Malad (West),</p>
            <p>Mumbai 400064, Maharashtra, INDIA</p>
          </div>

          {/* Right: Contact Info */}
          <div className="text-[15px] text-slate-300 leading-relaxed font-sans md:text-right mt-2">
            <p>
              Email your queries to: <a href="mailto:info@sarafcollege.org" className="text-white font-semibold hover:text-college-gold transition-colors">info@sarafcollege.org</a>
            </p>
            <p className="mt-1">
              Phone: <span className="text-white font-semibold">022-4520 7766</span>
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Ghanshyamdas Saraf College of Arts & Commerce. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Designed & Maintained for Mumbai University Students</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
