import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { GraduationCap, ShieldAlert } from 'lucide-react';

export const AdminSignUp = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-college-navy text-college-gold rounded-2xl shadow-md mb-3 border border-college-gold/40">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-heading font-extrabold text-college-navy dark:text-white">
            Register HOD Account
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ghanshyamdas Saraf College of Arts & Commerce
          </p>
        </div>

        {/* Notice regarding initial unapproved status */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            New HOD registrations require super-admin approval before publishing privileges are activated.
          </span>
        </div>

        {/* Clerk Prebuilt SignUp Component */}
        <div className="flex justify-center">
          <SignUp
            path="/admin/sign-up"
            routing="path"
            signInUrl="/admin/login"
            forceRedirectUrl="/admin"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminSignUp;
