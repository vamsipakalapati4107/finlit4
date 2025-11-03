import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { toast } from 'sonner';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  CheckCircle,
  Trash2,
  Award
} from 'lucide-react';

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  completed: boolean;
}

const GOAL_ICONS = ['🏠', '🚗', '✈️', '🎓', '💍', '🏖️', '💼', '🎮', '📱', '💎'];

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  
  const [newGoal, setNewGoal] = useState({
    name: '',
    icon: '🎯',
    target_amount: '',
    deadline: ''
  });

  const [addAmount, setAddAmount] = useState<Record<string, string>>({});

  useEffect(() => {
    loadGoals();
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!user) return;

    if (!newGoal.name || !newGoal.target_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user.id,
          name: newGoal.name,
          icon: newGoal.icon,
          target_amount: parseFloat(newGoal.target_amount),
          current_amount: 0,
          deadline: newGoal.deadline || null,
          completed: false
        });

      if (error) throw error;

      toast.success('Goal created! +50 XP');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, coins')
        .eq('id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ 
            xp: (profile.xp || 0) + 50,
            coins: (profile.coins || 0) + 10
          })
          .eq('id', user.id);
      }

      setNewGoal({ name: '', icon: '🎯', target_amount: '', deadline: '' });
      setIsAddingGoal(false);
      loadGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const addToGoal = async (goalId: string) => {
    const amount = parseFloat(addAmount[goalId] || '0');
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const newAmount = Number(goal.current_amount) + amount;
      const isCompleted = newAmount >= Number(goal.target_amount);

      const { error } = await supabase
        .from('savings_goals')
        .update({ 
          current_amount: newAmount,
          completed: isCompleted
        })
        .eq('id', goalId);

      if (error) throw error;

      if (isCompleted) {
        toast.success('🎉 Goal completed! +200 XP!');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp, coins')
          .eq('id', user!.id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ 
              xp: (profile.xp || 0) + 200,
              coins: (profile.coins || 0) + 50
            })
            .eq('id', user!.id);
        }
      } else {
        toast.success(`Added $${amount} to your goal! +10 XP`);
      }

      setAddAmount(prev => ({ ...prev, [goalId]: '' }));
      loadGoals();
    } catch (error) {
      console.error('Error adding to goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Goal deleted');
      loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const completedGoals = goals.filter(g => g.completed).length;
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Savings Goals
          </h1>
          
          <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Savings Goal</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Goal Name</Label>
                  <Input
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    placeholder="e.g., Emergency Fund"
                  />
                </div>

                <div>
                  <Label>Choose Icon</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {GOAL_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setNewGoal({ ...newGoal, icon })}
                        className={`text-3xl p-2 rounded-lg border-2 transition-all ${
                          newGoal.icon === icon ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Target Amount ($)</Label>
                  <Input
                    type="number"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                    placeholder="5000"
                  />
                </div>

                <div>
                  <Label>Deadline (Optional)</Label>
                  <Input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  />
                </div>

                <Button onClick={createGoal} className="w-full">
                  Create Goal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <Target className="h-8 w-8 mb-2" />
            <div className="text-sm opacity-90">Total Goals</div>
            <div className="text-3xl font-bold">{goals.length}</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <DollarSign className="h-8 w-8 mb-2" />
            <div className="text-sm opacity-90">Total Saved</div>
            <div className="text-3xl font-bold">${totalSaved.toFixed(0)}</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <TrendingUp className="h-8 w-8 mb-2" />
            <div className="text-sm opacity-90">Target</div>
            <div className="text-3xl font-bold">${totalTarget.toFixed(0)}</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CheckCircle className="h-8 w-8 mb-2" />
            <div className="text-sm opacity-90">Completed</div>
            <div className="text-3xl font-bold">{completedGoals}</div>
          </Card>
        </div>

        {totalTarget > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Overall Progress</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={overallProgress} className="h-4" />
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {overallProgress.toFixed(1)}%
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              ${totalSaved.toFixed(2)} of ${totalTarget.toFixed(2)}
            </p>
          </Card>
        )}

        {goals.length === 0 ? (
          <Card className="p-12 text-center">
            <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold mb-2">No Goals Yet</h3>
            <p className="text-gray-600 mb-6">Create your first savings goal to get started!</p>
            <Button onClick={() => setIsAddingGoal(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Goal
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {goals.map(goal => {
              const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
              const daysLeft = goal.deadline 
                ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                : null;

              return (
                <Card key={goal.id} className={`p-6 ${goal.completed ? 'border-green-500 border-2' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{goal.icon}</div>
                      <div>
                        <h3 className="text-xl font-bold">{goal.name}</h3>
                        {goal.deadline && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {daysLeft !== null && daysLeft > 0 
                                ? `${daysLeft} days left` 
                                : 'Due today'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {goal.completed && <Award className="h-8 w-8 text-green-500" />}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold">Progress</span>
                      <span>${Number(goal.current_amount).toFixed(2)} / ${Number(goal.target_amount).toFixed(2)}</span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-3" />
                    <div className="text-right text-sm text-gray-600 mt-1">
                      {progress.toFixed(1)}%
                    </div>
                  </div>

                  {!goal.completed && (
                    <div className="flex gap-2 mb-4">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={addAmount[goal.id] || ''}
                        onChange={(e) => setAddAmount(prev => ({ ...prev, [goal.id]: e.target.value }))}
                      />
                      <Button onClick={() => addToGoal(goal.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteGoal(goal.id)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}