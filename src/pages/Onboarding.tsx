import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleComplete = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ monthly_budget: parseFloat(budget) || 0 })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Welcome aboard! 🎉');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save preferences');
    }
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <p className="text-sm text-gray-600 text-center">Step {step} of {totalSteps}</p>
        </div>

        {step === 1 && (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Welcome to FinLit Master! 🎉
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Let's set up your account in just a few steps
            </p>
            <Button size="lg" onClick={() => setStep(2)}>
              Get Started
            </Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-3xl font-bold mb-4">Set Your Monthly Budget</h2>
            <p className="text-gray-600 mb-6">How much do you plan to spend each month?</p>
            
            <div className="mb-6">
              <Label htmlFor="budget">Monthly Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="2000"
                className="text-2xl p-6"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-3xl font-bold mb-4">All Set!</h2>
            <p className="text-xl text-gray-600 mb-8">
              You're ready to start your financial literacy journey
            </p>
            
            <div className="space-y-3 mb-8">
              <div className="p-4 bg-purple-50 rounded-lg text-left">
                <div className="font-semibold text-purple-900">✨ Track Expenses</div>
                <div className="text-sm text-purple-700">Monitor your spending in real-time</div>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg text-left">
                <div className="font-semibold text-pink-900">🎓 Learn & Earn</div>
                <div className="text-sm text-pink-700">Complete courses to gain XP and level up</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-left">
                <div className="font-semibold text-blue-900">🏆 Unlock Achievements</div>
                <div className="text-sm text-blue-700">Collect badges as you progress</div>
              </div>
            </div>

            <Button size="lg" onClick={handleComplete} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
