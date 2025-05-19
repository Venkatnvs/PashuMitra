import { useState } from "react";
import { PieChart, BarChart3, LayoutDashboard, Building, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const updateSchema = z.object({
  insideCount: z.coerce.number().min(0, "Count cannot be negative"),
  outsideCount: z.coerce.number().min(0, "Count cannot be negative"),
});

const CountPage = () => {
  const [cattleData, setCattleData] = useState({
    inside: 12,
    outside: 8,
    total: 20,
    lastUpdated: "2 hours ago"
  });
  
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState("pieChart");
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      insideCount: cattleData.inside,
      outsideCount: cattleData.outside,
    }
  });
  
  const onUpdateSubmit = (data) => {
    const newTotal = data.insideCount + data.outsideCount;
    
    setCattleData({
      inside: data.insideCount,
      outside: data.outsideCount,
      total: newTotal,
      lastUpdated: "Just now"
    });
    
    setUpdateDialogOpen(false);
    toast.success("Cattle count updated successfully!");
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Cattle Count Page</h2>
        <p className="text-center text-muted-foreground text-2xl pt-8">
          Coming Soon...
        </p>
      </div>
    </MainLayout>
  )
  
  // Render pie chart visualization
  const renderPieChart = () => {
    const insidePercentage = Math.round((cattleData.inside / cattleData.total) * 100) || 0;
    const outsidePercentage = 100 - insidePercentage;
    
    return (
      <div className="relative w-60 h-60 mx-auto my-8">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Inside Ground Segment */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke="hsl(var(--primary))"
            strokeWidth="10"
            strokeDasharray={`${insidePercentage} ${outsidePercentage}`}
            strokeDashoffset="0"
          />
          
          {/* Outside Ground Segment */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            strokeDasharray={`${outsidePercentage} ${insidePercentage}`}
            strokeDashoffset={`-${insidePercentage}`}
          />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold">{cattleData.total}</span>
          <span className="text-sm text-muted-foreground">Total Cattle</span>
        </div>
      </div>
    );
  };
  
  // Render horizontal bar chart visualization
  const renderBarChart = () => {
    const maxValue = Math.max(cattleData.inside, cattleData.outside);
    const insideWidth = maxValue > 0 ? (cattleData.inside / maxValue) * 100 : 0;
    const outsideWidth = maxValue > 0 ? (cattleData.outside / maxValue) * 100 : 0;
    
    return (
      <div className="space-y-8 py-8">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
              <span>Inside Ground</span>
            </div>
            <span className="font-semibold">{cattleData.inside}</span>
          </div>
          <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full"
              style={{ width: `${insideWidth}%` }}
            ></div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-muted-foreground mr-2"></div>
              <span>Outside Ground</span>
            </div>
            <span className="font-semibold">{cattleData.outside}</span>
          </div>
          <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-muted-foreground rounded-full"
              style={{ width: `${outsideWidth}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render visual representation with cattle icons
  const renderVisualLayout = () => {
    const renderCattleIcons = (count, type) => {
      return Array(count).fill(0).map((_, index) => (
        <div 
          key={`${type}-${index}`}
          className={`
            w-8 h-8 flex items-center justify-center rounded-full
            ${type === 'inside' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
          `}
        >
          <span className="text-xs font-medium">{index + 1}</span>
        </div>
      ));
    };
    
    return (
      <div className="grid grid-cols-1 gap-8 py-6">
        <div className="space-y-3">
          <div className="flex items-center">
            <Building className="h-5 w-5 mr-2 text-primary" />
            <h4 className="font-medium">Inside Ground ({cattleData.inside})</h4>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {renderCattleIcons(cattleData.inside, 'inside')}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <Trees className="h-5 w-5 mr-2 text-muted-foreground" />
            <h4 className="font-medium">Outside Ground ({cattleData.outside})</h4>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {renderCattleIcons(cattleData.outside, 'outside')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Cattle Count</h2>
        
        <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Update Count</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Cattle Count</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="insideCount">Inside Ground</Label>
                <Input 
                  id="insideCount" 
                  type="number"
                  {...register("insideCount")}
                />
                {errors.insideCount && (
                  <p className="text-red-500 text-xs">{errors.insideCount.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="outsideCount">Outside Ground</Label>
                <Input 
                  id="outsideCount" 
                  type="number"
                  {...register("outsideCount")}
                />
                {errors.outsideCount && (
                  <p className="text-red-500 text-xs">{errors.outsideCount.message}</p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Cattle Distribution</CardTitle>
              <CardDescription>
                Last updated {cattleData.lastUpdated}
              </CardDescription>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex gap-1">
                    <Button 
                      variant={activeView === "pieChart" ? "default" : "outline"} 
                      size="icon"
                      onClick={() => setActiveView("pieChart")}
                    >
                      <PieChart className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={activeView === "barChart" ? "default" : "outline"} 
                      size="icon"
                      onClick={() => setActiveView("barChart")}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={activeView === "visual" ? "default" : "outline"} 
                      size="icon"
                      onClick={() => setActiveView("visual")}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Change visualization</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {activeView === "pieChart" && renderPieChart()}
          {activeView === "barChart" && renderBarChart()}
          {activeView === "visual" && renderVisualLayout()}
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <Building className="h-5 w-5 mb-2 text-primary" />
                <span className="text-2xl font-bold">{cattleData.inside}</span>
                <span className="text-sm text-muted-foreground">Inside Ground</span>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <Trees className="h-5 w-5 mb-2 text-muted-foreground" />
                <span className="text-2xl font-bold">{cattleData.outside}</span>
                <span className="text-sm text-muted-foreground">Outside Ground</span>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribution History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-center text-muted-foreground">
            <p>History charts will appear here as you update counts</p>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default CountPage; 