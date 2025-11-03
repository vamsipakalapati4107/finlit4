import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'food', label: 'Food & Dining 🍔', icon: '🍔' },
  { value: 'transport', label: 'Transportation 🚗', icon: '🚗' },
  { value: 'shopping', label: 'Shopping 🛍️', icon: '🛍️' },
  { value: 'entertainment', label: 'Entertainment 🎬', icon: '🎬' },
  { value: 'bills', label: 'Bills & Utilities 📄', icon: '📄' },
  { value: 'health', label: 'Healthcare 🏥', icon: '🏥' },
  { value: 'education', label: 'Education 📚', icon: '📚' },
  { value: 'other', label: 'Other 📌', icon: '📌' },
];

export default function Expenses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash'
  });

  useEffect(() => {
    loadExpenses();
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (data) setExpenses(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: parseFloat(formData.amount),
          category: formData.category,
          description: formData.description,
          date: formData.date,
          payment_method: formData.payment_method
        });

      if (error) throw error;

      // Award XP for logging an expense
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single();

      const currentXP = profile?.xp || 0;
      await supabase
        .from('profiles')
        .update({ xp: currentXP + 10 })
        .eq('id', user.id);

      // Unlock "First Expense" achievement if applicable
      const { data: countData } = await supabase
        .from('expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const totalForUser = (countData as any)?.length ?? undefined; // head:true may not return rows in some clients
      if (totalForUser === undefined) {
        // Fallback: count manually
        const { data: allExpenses } = await supabase
          .from('expenses')
          .select('id')
          .eq('user_id', user.id);
        if ((allExpenses?.length || 0) === 1) {
          await ensureAchievement('First Expense', '💸', 'Logged your first expense');
          await unlockAchievement(user.id, 'First Expense');
        }
      } else if (totalForUser === 1) {
        await ensureAchievement('First Expense', '💸', 'Logged your first expense');
        await unlockAchievement(user.id, 'First Expense');
      }

      toast.success('Expense added successfully! +10 XP');
      setFormData({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'cash'
      });
      loadExpenses();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const ensureAchievement = async (name: string, icon: string, description: string) => {
    const { data: existing } = await supabase
      .from('achievements')
      .select('id')
      .eq('name', name)
      .limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from('achievements').insert({ name, icon, description, xp_reward: 50, coin_reward: 10, rarity: 'common' });
    }
  };

  const unlockAchievement = async (userId: string, name: string) => {
    const { data: ach } = await supabase
      .from('achievements')
      .select('id')
      .eq('name', name)
      .single();
    if (!ach?.id) return;

    // check if already unlocked
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', ach.id)
      .limit(1);
    if (existing && existing.length > 0) return;

    await supabase.from('user_achievements').insert({ user_id: userId, achievement_id: ach.id });
    toast.success('🏆 Achievement unlocked: ' + name);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete expense');
    } else {
      toast.success('Expense deleted');
      loadExpenses();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Track Expenses
        </h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add Expense Form */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Plus className="h-6 w-6" />
              Add New Expense
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment">Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="debit">Debit Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
            </form>
          </Card>

          {/* Expenses List */}
          <div>
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">Recent Expenses</h2>

              {expenses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No expenses yet. Add your first one!</p>
              ) : (
                <div className="space-y-3">
                  {expenses.slice(0, 10).map((expense) => {
                    const category = CATEGORIES.find(c => c.value === expense.category);
                    return (
                      <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{category?.icon || '📌'}</span>
                          <div>
                            <div className="font-semibold">${Number(expense.amount).toFixed(2)}</div>
                            <div className="text-sm text-gray-600">{expense.description || category?.label}</div>
                            <div className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
