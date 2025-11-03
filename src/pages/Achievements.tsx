import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Trophy, Award, Star, Download } from 'lucide-react';

export default function Achievements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) setProfile(profileData);

    const { data: quizData } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id);

    const mockAchievements = [
      { 
        id: '1', 
        name: 'First Login', 
        icon: '🎉', 
        unlocked: true,
        description: 'Signed up and started your journey'
      },
      { 
        id: '2', 
        name: 'Quiz Master', 
        icon: '🧠', 
        unlocked: (quizData?.length || 0) >= 5,
        description: 'Completed 5 quizzes'
      },
      { 
        id: '3', 
        name: 'Level 5', 
        icon: '⭐', 
        unlocked: (profileData?.level || 0) >= 5,
        description: 'Reached level 5'
      },
      { 
        id: '4', 
        name: 'Streak Keeper', 
        icon: '🔥', 
        unlocked: (profileData?.streak_days || 0) >= 7,
        description: '7-day login streak'
      },
      { 
        id: '5', 
        name: 'Budget Pro', 
        icon: '💰', 
        unlocked: false,
        description: 'Stayed within budget for 3 months'
      },
      { 
        id: '6', 
        name: 'Savings Hero', 
        icon: '🏆', 
        unlocked: false,
        description: 'Reached first savings goal'
      },
    ];

    setAchievements(mockAchievements);
  };

  const generateCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 800);

    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, 1120, 720);

    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate of Achievement', 600, 150);

    ctx.fillStyle = '#000000';
    ctx.font = '30px Arial';
    ctx.fillText('This certifies that', 600, 250);

    ctx.font = 'bold 50px Arial';
    ctx.fillStyle = '#EC4899';
    ctx.fillText(profile?.full_name || 'Financial Learner', 600, 330);

    ctx.fillStyle = '#000000';
    ctx.font = '28px Arial';
    ctx.fillText('has successfully completed financial literacy training', 600, 420);
    ctx.fillText(`achieving Level ${profile?.level || 1}`, 600, 470);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(`Total XP: ${profile?.xp || 0}`, 600, 550);
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 600, 590);

    const link = document.createElement('a');
    link.download = 'financial-literacy-certificate.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Achievements & Certificates
          </h1>
          <p className="text-gray-600">You've unlocked {unlockedCount} of {achievements.length} achievements</p>
        </div>

        <Card className="p-8 mb-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Your Certificate</h2>
              <p className="opacity-90">Download your financial literacy certificate</p>
              <div className="mt-4 space-y-1">
                <div className="text-sm">Level {profile?.level || 1} Certified</div>
                <div className="text-sm">{profile?.xp || 0} Total XP</div>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={generateCertificate}
              className="flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Download Certificate
            </Button>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {achievements.map((achievement) => (
            <Card 
              key={achievement.id} 
              className={`p-6 ${achievement.unlocked ? 'bg-white' : 'bg-gray-100 opacity-60'}`}
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{achievement.icon}</div>
                <h3 className="text-xl font-bold mb-2">{achievement.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{achievement.description}</p>
                {achievement.unlocked ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="font-semibold">Unlocked!</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">🔒 Locked</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
