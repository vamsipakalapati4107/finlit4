import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Award, 
  Flame,
  Plus,
  BookOpen,
  Brain
} from 'lucide-react';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalExpenses: 0,
    budget: 0,
    savings: 0,
    goalsCount: 0
  });

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) setProfile(data);
  };

  const loadStats = async () => {
    if (!user) return;

    // Load expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id);

    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Load goals
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id);

    const goalsCount = goals?.length || 0;
    const savings = goals?.reduce((sum, g) => sum + Number(g.current_amount), 0) || 0;

    setStats({
      totalExpenses,
      budget: profile?.monthly_budget || 0,
      savings,
      goalsCount
    });
  };

  const xpToNextLevel = 1000;
  const currentLevelXP = (profile?.xp || 0) % 1000;
  const xpProgress = (currentLevelXP / xpToNextLevel) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name || user?.email}! 👋
          </h2>
          <p className="text-gray-600">Ready to master your finances today?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-8 w-8" />
              <div className="text-right">
                <div className="text-sm opacity-90">Total Spent</div>
                <div className="text-2xl font-bold">${stats.totalExpenses.toFixed(0)}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8" />
              <div className="text-right">
                <div className="text-sm opacity-90">Savings</div>
                <div className="text-2xl font-bold">${stats.savings.toFixed(0)}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <Target className="h-8 w-8" />
              <div className="text-right">
                <div className="text-sm opacity-90">Goals</div>
                <div className="text-2xl font-bold">{stats.goalsCount}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <Flame className="h-8 w-8" />
              <div className="text-right">
                <div className="text-sm opacity-90">Streak</div>
                <div className="text-2xl font-bold">{profile?.streak_days || 0} days</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">Level {profile?.level || 1}</h3>
              <p className="text-sm text-gray-600">
                {currentLevelXP} / {xpToNextLevel} XP
              </p>
            </div>
            <Award className="h-12 w-12 text-yellow-500" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/expenses')}>
            <Plus className="h-10 w-10 text-purple-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Add Expense</h3>
            <p className="text-gray-600">Track your spending</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/budget')}>
            <Target className="h-10 w-10 text-green-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Budget</h3>
            <p className="text-gray-600">Plan your finances</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/ai-coach')}>
            <Brain className="h-10 w-10 text-pink-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Coach</h3>
            <p className="text-gray-600">Get personalized advice</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/quiz')}>
            <Award className="h-10 w-10 text-orange-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Take Quiz</h3>
            <p className="text-gray-600">Earn XP & badges</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
