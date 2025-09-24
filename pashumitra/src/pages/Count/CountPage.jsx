import { useEffect, useRef, useState } from "react";
import { PieChart, BarChart3, LayoutDashboard, Building, Trees, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { database } from "@/firebase/firebaseConfig";
import { onValue, ref, update } from "firebase/database";

const RTDB_PATH = "/counters/cattle";

const CountPage = () => {
  const [cattleData, setCattleData] = useState({
    inside: 0,
    outside: 0,
    total: 0,
    lastDelta: 0,
    lastUpdatedMs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [herdInput, setHerdInput] = useState(0);
  const [activeView, setActiveView] = useState("pieChart");
  const lastDeltaRef = useRef(0);
  const [animKey, setAnimKey] = useState(0);
  const [animDirection, setAnimDirection] = useState("right");
  const [showAnim, setShowAnim] = useState(false);

  useEffect(() => {
    const r = ref(database, RTDB_PATH);
    const unsub = onValue(
      r,
      (snap) => {
        const val = snap.val() || {};
        // Derive outside if device didn't send it
        const next = {
          inside: Number(val.inside || 0),
          outside: Number(
            val.outside != null ? val.outside : Math.max((val.total || 0) - (val.inside || 0), 0)
          ),
          total: Number(val.total || ((val.inside || 0) + (val.outside || 0))),
          lastDelta: Number(val.lastDelta || 0),
          lastUpdatedMs: Number(val.lastUpdatedMs || 0),
        };
        setCattleData(next);
        setLoading(false);
        if (typeof val.totalHerd === "number") {
          setHerdInput(Number(val.totalHerd));
        }

        if (next.lastDelta && next.lastDelta !== 0) {
          lastDeltaRef.current = next.lastDelta;
          setAnimDirection(next.lastDelta > 0 ? "right" : "left");
          setAnimKey((k) => k + 1);
          setShowAnim(true);
          setTimeout(() => setShowAnim(false), 1200);
        }
      },
      (err) => {
        console.error(err);
        setLoading(false);
        toast.error("Failed to load live counts");
      }
    );
    return () => unsub();
  }, []);

  const handleReset = async () => {
    try {
      await update(ref(database, RTDB_PATH), {
        inside: 0,
        outside: 0,
        total: 0,
        lastDelta: 0,
        lastUpdatedMs: Date.now(),
      });
      toast.success("Counts reset");
    } catch (e) {
      console.error(e);
      toast.error("Reset failed");
    }
  };

  const handleSaveHerd = async () => {
    const herd = Number(herdInput) || 0;
    if (herd < 0) {
      toast.error("Herd size cannot be negative");
      return;
    }
    try {
      const outside = Math.max(herd - (cattleData.inside || 0), 0);
      await update(ref(database, RTDB_PATH), {
        totalHerd: herd,
        total: herd,
        outside,
        lastUpdatedMs: Date.now(),
      });
      toast.success("Herd size saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save herd size");
    }
  };

  // return (
  //   <MainLayout>
  //     <div className="mb-6">
  //       <h2 className="text-2xl font-bold mb-2">Cattle Count Page</h2>
  //       <p className="text-center text-muted-foreground text-2xl pt-8">
  //         Coming Soon...
  //       </p>
  //     </div>
  //   </MainLayout>
  // )
  
  // Render pie chart visualization
  const renderPieChart = () => {
    const insidePercentage = Math.round(((cattleData.total ? cattleData.inside / cattleData.total : 0) * 100)) || 0;
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
        <h2 className="text-3xl font-bold tracking-tight">Cattle Count</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm hidden md:inline">Total herd</span>
            <Input
              className="h-9 w-28"
              type="number"
              value={herdInput}
              onChange={(e) => setHerdInput(e.target.value)}
            />
            <Button size="sm" variant="secondary" onClick={handleSaveHerd} className="gap-1">
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${loading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {loading ? 'Connecting…' : 'Live'}
            </span>
            <span>Updated: {cattleData.lastUpdatedMs ? new Date(cattleData.lastUpdatedMs).toLocaleTimeString() : '-'}</span>
          </div>
          <Button size="sm" variant="outline" onClick={handleReset}>Reset</Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Cattle Distribution</CardTitle>
              <CardDescription>
                Total: <span className="font-semibold">{cattleData.total}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-xl font-bold">{cattleData.total}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Building className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Inside</div>
                  <div className="text-xl font-bold">{cattleData.inside}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Trees className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Outside</div>
                  <div className="text-xl font-bold">{cattleData.outside}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          {activeView === "pieChart" && renderPieChart()}
          {activeView === "barChart" && renderBarChart()}
          {activeView === "visual" && renderVisualLayout()}
        </CardContent>
      </Card>

      {showAnim && (
        <div key={animKey} className="fixed bottom-6 left-0 right-0 pointer-events-none">
          <div className="mx-auto w-full max-w-md">
            <div
              className={`mx-4 px-4 py-2 rounded-full shadow-md text-white font-semibold 
                ${animDirection === "right" ? "bg-green-600" : "bg-red-600"}
                animate-[slide_1.1s_ease-out_forwards]
              `}
            >
              {lastDeltaRef.current > 0 ? `+${lastDeltaRef.current}` : `${lastDeltaRef.current}`}
            </div>
          </div>
          <style>{`
            @keyframes slide {
              0% { opacity: 0; transform: translateY(12px); }
              20% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 0; transform: translateY(-10px); }
            }
          `}</style>
        </div>
      )}
    </MainLayout>
  );
};

export default CountPage; 