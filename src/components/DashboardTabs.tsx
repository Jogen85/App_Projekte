import { useLocation, Link } from 'react-router-dom';

export default function DashboardTabs() {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { path: '/', label: 'Projekte' },
    { path: '/it-costs', label: 'IT-Kosten' },
  ];

  return (
    <div className="flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = currentPath === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`
              px-6 py-3 text-sm font-medium transition-colors
              ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
