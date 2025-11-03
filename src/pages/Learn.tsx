import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { BookOpen, Clock, Award, CheckCircle, Lock, ArrowLeft, Play } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  lessons_count: number;
  estimated_hours: number;
  icon: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  order_index: number;
  xp_reward: number;
  estimated_minutes: number;
}

interface UserProgress {
  lesson_id: string;
  completed: boolean;
}

export default function Learn() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [ensuringLessonId, setEnsuringLessonId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams();

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (courseId) {
      loadCourseDetails(courseId);
    }
  }, [courseId]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at');

      if (error) throw error;
      if (data) setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetails = async (courseId: string) => {
    try {
      setLoading(true);
      
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setSelectedCourse(courseData);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      if (user) {
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        setUserProgress(progressData || []);
      }
    } catch (error) {
      console.error('Error loading course details:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const ensureLessonContent = async (lesson: Lesson) => {
    if (!selectedCourse) return lesson;
    if (lesson.content && lesson.content.trim() !== '') return lesson;
    try {
      setEnsuringLessonId(lesson.id);
      const { data, error } = await supabase.functions.invoke('generate-lesson', {
        body: { lessonId: lesson.id, courseId: selectedCourse.id, title: lesson.title }
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Failed to generate');
      }
      if ((data as any)?.content) {
        const content = (data as any).content as string;
        setLessons(curr => curr.map(l => l.id === lesson.id ? { ...l, content } : l));
        return { ...lesson, content } as Lesson;
      }
    } catch (e: any) {
      console.error('ensureLessonContent error:', e?.message || e);
      toast.error(`Could not generate lesson content: ${e?.message || 'Unknown error'}`);
    } finally {
      setEnsuringLessonId(null);
    }
    return lesson;
  };

  const startLesson = async (lesson: Lesson) => {
    const withContent = await ensureLessonContent(lesson);
    setCurrentLesson(withContent);
  };

  const completeLesson = async () => {
    if (!user || !currentLesson || !selectedCourse) return;

    try {
      const { error: progressError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          course_id: selectedCourse.id,
          lesson_id: currentLesson.id,
          completed: true,
          completed_at: new Date().toISOString()
        });

      if (progressError) throw progressError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level, coins')
        .eq('id', user.id)
        .single();

      if (profile) {
        const newXP = (profile.xp || 0) + currentLesson.xp_reward;
        const newLevel = Math.floor(newXP / 1000) + 1;
        const newCoins = (profile.coins || 0) + Math.floor(currentLesson.xp_reward / 10);

        await supabase
          .from('profiles')
          .update({ 
            xp: newXP, 
            level: newLevel,
            coins: newCoins
          })
          .eq('id', user.id);

        toast.success(`Lesson completed! +${currentLesson.xp_reward} XP, +${Math.floor(currentLesson.xp_reward / 10)} coins!`);
      }

      loadCourseDetails(selectedCourse.id);
      setCurrentLesson(null);
    } catch (error) {
      console.error('Error completing lesson:', error);
      toast.error('Failed to complete lesson');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return userProgress.some(p => p.lesson_id === lessonId && p.completed);
  };

  const getCourseProgress = () => {
    if (lessons.length === 0) return 0;
    const completed = lessons.filter(l => isLessonCompleted(l.id)).length;
    return Math.round((completed / lessons.length) * 100);
  };

  if (currentLesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentLesson(null)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>

          <Card className="p-8">
            <div className="mb-6">
              <Badge className="mb-2">Lesson {currentLesson.order_index}</Badge>
              <h1 className="text-3xl font-bold mb-2">{currentLesson.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{currentLesson.estimated_minutes} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span>+{currentLesson.xp_reward} XP</span>
                </div>
              </div>
            </div>

            <div className="prose max-w-none mb-8">
              <div dangerouslySetInnerHTML={{ __html: currentLesson.content.replace(/\n/g, '<br />') }} />
            </div>

            <div className="flex gap-3">
              {!isLessonCompleted(currentLesson.id) && (
                <Button onClick={completeLesson} size="lg" className="flex-1">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Complete Lesson
                </Button>
              )}
              {isLessonCompleted(currentLesson.id) && (
                <Badge variant="secondary" className="flex-1 justify-center py-3">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Completed
                </Badge>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (selectedCourse) {
    const progress = getCourseProgress();
    const completedCount = lessons.filter(l => isLessonCompleted(l.id)).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => {
              setSelectedCourse(null);
              navigate('/learn');
            }}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Courses
          </Button>

          <Card className="p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-5xl mb-4">{selectedCourse.icon}</div>
                <Badge className={getDifficultyColor(selectedCourse.difficulty)}>
                  {selectedCourse.difficulty}
                </Badge>
                <h1 className="text-3xl font-bold mt-2 mb-3">{selectedCourse.title}</h1>
                <p className="text-gray-600 mb-4">{selectedCourse.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{lessons.length} lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{selectedCourse.estimated_hours}h total</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    <span>{lessons.reduce((sum, l) => sum + l.xp_reward, 0)} XP</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">Course Progress</span>
                <span>{completedCount} / {lessons.length} lessons</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </Card>

          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const completed = isLessonCompleted(lesson.id);
              const previousCompleted = index === 0 || isLessonCompleted(lessons[index - 1].id);
              const locked = !previousCompleted && !completed;

              return (
                <Card 
                  key={lesson.id} 
                  className={`p-6 ${locked ? 'opacity-60' : 'hover:shadow-lg'} transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        completed ? 'bg-green-100' : locked ? 'bg-gray-100' : 'bg-purple-100'
                      }`}>
                        {completed ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : locked ? (
                          <Lock className="h-6 w-6 text-gray-400" />
                        ) : (
                          <Play className="h-6 w-6 text-purple-600" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{lesson.title}</h3>
                          {completed && <Badge variant="secondary">Completed</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Lesson {lesson.order_index}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{lesson.estimated_minutes} min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-purple-600" />
                            <span>+{lesson.xp_reward} XP</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => !locked && startLesson(lesson)}
                      disabled={locked}
                      variant={completed ? 'outline' : 'default'}
                    >
                      {ensuringLessonId === lesson.id ? 'Preparing...' : (completed ? 'Review' : locked ? 'Locked' : 'Start')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Learning Hub
          </h1>
          <p className="text-xl text-gray-600">Master financial literacy through interactive courses</p>
        </div>

        {courses.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Courses Available</h3>
            <p className="text-gray-600">Check back soon for new learning content!</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="p-6 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">{course.icon || '📚'}</div>
                
                <div className="mb-3">
                  <Badge className={getDifficultyColor(course.difficulty)}>
                    {course.difficulty}
                  </Badge>
                </div>

                <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{course.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.lessons_count} lessons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.estimated_hours}h</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  Start Learning
                </Button>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Card className="p-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Award className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Test Your Knowledge?</h2>
            <p className="text-xl mb-6 opacity-90">Take a quiz and earn XP!</p>
            <Button size="lg" variant="secondary" onClick={() => navigate('/quiz')}>
              Start Quiz
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}