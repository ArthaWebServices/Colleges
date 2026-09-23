import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
      <h1 className="text-6xl font-extrabold text-college-primary dark:text-college-accent mb-4">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">Page Not Found</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
        Oops! The page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/" 
        className="px-6 py-3 bg-college-primary hover:bg-college-secondary text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
      >
        Go Back Home
      </Link>
    </div>
  );
};

export default NotFound;
