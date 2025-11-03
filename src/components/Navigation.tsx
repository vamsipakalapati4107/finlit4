import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Home, DollarSign, Target, BookOpen, Brain, Trophy, Award, BarChart3, PiggyBank } from 'lucide-react';

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/expenses', label: 'Expenses', icon: DollarSign },
    { path: '/budget', label: 'Budget', icon: Target },
    { path: '/goals', label: 'Goals', icon: PiggyBank },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/learn', label: 'Learn', icon: BookOpen },
    { path: '/quiz', label: 'Quiz', icon: Brain },
    { path: '/ai-coach', label: 'AI Coach', icon: Award },
    { path: '/achievements', label: 'Achievements', icon: Trophy },
  ];

  return (
    <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-8">
            <h1 
              className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              FinLit Master
            </h1>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}