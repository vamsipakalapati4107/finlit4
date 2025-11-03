import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, AlertTriangle, Target } from 'lucide-react';

const CATEGORIES = [
  { value: 'food', label: 'Food & Dining', icon: '🍔', recommended: 15 },
  { value: 'transport', label: 'Transportation', icon: '🚗', recommended: 10 },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', recommended: 10 },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬', recommended: 5 },
  { value: 'bills', label: 'Bills & Utilities', icon: '📄', recommended: 25 },
  { value: 'health', label: 'Healthcare', icon: '🏥', recommended: 10 },
  { value: 'education', label: 'Education', icon: '📚', recommended: 5 },
  { value: 'savings', label: 'Savings', icon: '💰', recommended: 20 },
];

export default function Budget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totalBudget, setTotalBudget] = useState(0);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_budget')
      .eq('id', user.id)
      .single();

    if (profile) setTotalBudget(profile.monthly_budget || 0);

    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id);

    if (budgetData) {
      const budgetMap: Record<string, number> = {};
      budgetData.forEach(b => budgetMap[b.category] = Number(b.allocated_amount));
      setBudgets(budgetMap);
    }

    const { data: expenses } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('user_id', user.id);

    if (expenses) {
      const spendingMap: Record<string, number> = {};
      expenses.forEach(e => {
        spendingMap[e.category] = (spendingMap[e.category] || 0) + Number(e.amount);
      });
      setSpending(spendingMap);
    }
  };

  const saveBudget = async (category: string, amount: number) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user.id,
          category,
          allocated_amount: amount,
          period: 'monthly'
        });

      if (error) throw error;
      toast.success('Budget updated');
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommended = () => {
    CATEGORIES.forEach(cat => {
      const recommended = (totalBudget * cat.recommended) / 100;
      saveBudget(cat.value, recommended);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Budget Planning
        </h1>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <DollarSign className="h-8 w-8 mb-2" />
            <div className="text-sm opacity-90">Total Budget</div>
            <div className="text-3xl font-bold">${totalBudget.toFixed(0)}</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <TrendingUp className="h-8 w-8 mb-2" />
            <div className="text-sm opacity-90">Total Spent</div>
            <div className="text-3xl font-bold">
              ${Object.values(spending).reduce((a, b) => a + b, 0).toFixed(0)}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <Target className="h-8 w-8 mb-2" />
            <div className="text-sm opacity-90">Remaining</div>
            <div className="text-3xl font-bold">
              ${(totalBudget - Object.values(spending).reduce((a, b) => a + b, 0)).toFixed(0)}
            </div>
          </Card>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Category Budgets</h2>
            <Button onClick={applyRecommended} variant="outline">
              Apply Recommended
            </Button>
          </div>

          <div className="space-y-6">
            {CATEGORIES.map(cat => {
              const allocated = budgets[cat.value] || 0;
              const spent = spending[cat.value] || 0;
              const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
              const isOverBudget = percentage > 100;

              return (
                <div key={cat.value} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="font-semibold">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        ${spent.toFixed(0)} / ${allocated.toFixed(0)}
                      </div>
                      {isOverBudget && <AlertTriangle className="h-5 w-5 text-red-500" />}
                    </div>
                  </div>

                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className={`h-3 ${isOverBudget ? 'bg-red-100' : ''}`}
                  />

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={allocated}
                      onChange={(e) => saveBudget(cat.value, Number(e.target.value))}
                      className="max-w-32"
                    />
                    <span className="text-sm text-gray-600">
                      (Recommended: {cat.recommended}% = ${((totalBudget * cat.recommended) / 100).toFixed(0)})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
