import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Target,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

interface SpendingData {
  month: string;
  amount: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#8b5cf6',
  transport: '#ec4899',
  shopping: '#3b82f6',
  entertainment: '#10b981',
  bills: '#f59e0b',
  health: '#ef4444',
  education: '#06b6d4',
  other: '#64748b'
};

export default function Analytics() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<SpendingData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    avgDaily: 0,
    highestCategory: '',
    trend: 0
  });

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (!expenses || expenses.length === 0) {
        setLoading(false);
        return;
      }

      // Process monthly data
      const monthlyMap = new Map<string, number>();
      expenses.forEach(exp => {
        const month = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + Number(exp.amount));
      });

      const monthlyChartData = Array.from(monthlyMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .slice(0, 6)
        .reverse();

      setMonthlyData(monthlyChartData);

      // Process category data
      const categoryMap = new Map<string, number>();
      expenses.forEach(exp => {
        categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + Number(exp.amount));
      });

      const categoryChartData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: CATEGORY_COLORS[name] || '#64748b'
        }))
        .sort((a, b) => b.value - a.value);

      setCategoryData(categoryChartData);

      // Calculate stats
      const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const daysTracked = Math.max(1, new Set(expenses.map(e => e.date)).size);
      const avgDaily = totalSpent / daysTracked;
      const highestCategory = categoryChartData[0]?.name || 'N/A';
      
      const trend = monthlyChartData.length >= 2
        ? ((monthlyChartData[monthlyChartData.length - 1].amount - monthlyChartData[monthlyChartData.length - 2].amount) / monthlyChartData[monthlyChartData.length - 2].amount) * 100
        : 0;

      setStats({ totalSpent, avgDaily, highestCategory, trend });

      // Generate insights
      const newInsights: string[] = [];

      if (trend > 10) {
        newInsights.push(`⚠️ Your spending increased by ${trend.toFixed(1)}% this month. Consider reviewing your budget.`);
      } else if (trend < -10) {
        newInsights.push(`✅ Great job! Your spending decreased by ${Math.abs(trend).toFixed(1)}% this month.`);
      }

      if (categoryChartData.length > 0) {
        const topCategory = categoryChartData[0];
        const topPercentage = (topCategory.value / totalSpent) * 100;
        
        if (topPercentage > 40) {
          newInsights.push(`💡 ${topCategory.name} accounts for ${topPercentage.toFixed(1)}% of your spending.`);
        }
      }

      if (expenses.length >= 30) {
        newInsights.push(`🎉 You've logged ${expenses.length} transactions! Consistent tracking is key.`);
      }

      setInsights(newInsights.slice(0, 5));
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Financial Analytics
        </h1>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Spent</span>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold">${stats.totalSpent.toFixed(0)}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Daily Average</span>
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold">${stats.avgDaily.toFixed(2)}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Top Category</span>
              <Target className="h-5 w-5 text-pink-600" />
            </div>
            <div className="text-2xl font-bold">{stats.highestCategory}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Monthly Trend</span>
              {stats.trend > 0 ? (
                <TrendingUp className="h-5 w-5 text-red-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className={`text-3xl font-bold ${stats.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
            </div>
          </Card>
        </div>

        {insights.length > 0 && (
          <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold">AI Insights</h2>
            </div>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <p className="text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Tabs defaultValue="monthly" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
            <TabsTrigger value="category">Category Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6">Monthly Spending Trend</h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      name="Spending"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No data available. Start tracking expenses to see trends!
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="category">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-6">Category Distribution</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No category data available
                  </div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold mb-6">Category Comparison</h3>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Bar dataKey="value" name="Amount">
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No category data available
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}