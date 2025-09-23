import MainLayout from "@/components/layout/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Power, Unlock, Lock, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { database } from "@/firebase/firebaseConfig";
import { onValue, ref, set } from "firebase/database";

const FeedPage = () => {
  const [status, setStatus] = useState({
    weight: 0,
    motorState: "STOPPED",
    servoPosition: 70,
    updatedMs: 0,
  });

  useEffect(() => {
    const r = ref(database, "/feeder/status");
    const unsub = onValue(r, (snap) => {
      const v = snap.val() || {};
      setStatus({
        weight: Number(v.weight || 0),
        motorState: String(v.motorState || "STOPPED"),
        servoPosition: Number(v.servoPosition || 70),
        updatedMs: Number(v.updatedMs || 0),
      });
    });
    return () => unsub();
  }, []);

  const sendMotor = async (cmd) => {
    // Optimistic update for snappy UI
    setStatus((s) => ({ ...s, motorState: cmd === "stop" ? "STOPPED" : cmd.toUpperCase() }));
    await set(ref(database, "/feeder/commands/motor"), cmd);
  };
  const sendServo = async (cmd) => {
    // Optimistic update for snappy UI (firmware supports only open/close)
    setStatus((s) => ({ ...s, servoPosition: cmd === "open" ? 180 : 70 }));
    await set(ref(database, "/feeder/commands/servo"), cmd);
  };

  const sendTare = async () => {
    await set(ref(database, "/feeder/commands/tare"), "tare");
    await set(ref(database, "/feeder/status/weight"), 0);
  };

  // Normal button controls: click to start, separate Stop to halt

  // Note: Motor controls are push-to-run. No tap pulse fallback to ensure true hold behavior.

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Feeder Control</h2>
        <p className="text-muted-foreground">Control via Firebase bridge</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-2 border-dashed lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="text-5xl font-extrabold tracking-tight">{status.weight.toFixed(3)}</div>
              <span className="text-muted-foreground mb-1">kg</span>
            </div>
            <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, (status.weight / 10) * 100))}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-md bg-muted">
                <p className="text-muted-foreground">Motor</p>
                <p className="font-medium">{status.motorState}</p>
              </div>
              <div className="p-3 rounded-md bg-muted">
                <p className="text-muted-foreground">Servo</p>
                <p className="font-medium">{status.servoPosition}</p>
              </div>
            </div>
            <div>
              <Button onClick={sendTare} variant="secondary" className="w-full">
                <RotateCw className="h-4 w-4 mr-2" /> Zero Scale
              </Button>
            </div>
            <div className="mt-2 rounded-lg overflow-hidden bg-muted/50">
              <img src="/logo.webp" alt="Feeder" className="w-full h-28 object-cover opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed lg:col-span-1">
          <CardHeader>
            <CardTitle className="tracking-tight">Motor Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs mx-auto">
              <div className="grid grid-cols-3 gap-2">
                <div />
                <Button
                  onClick={() => sendMotor("forward")}
                  className="h-16 w-16 rounded-full bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  title="Forward (hold)"
                >
                  <ChevronUp className="h-6 w-6" />
                </Button>
                <div />

                <div />
                <Button onClick={() => sendMotor("stop")} variant="destructive" className="h-16 w-16 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform" title="Stop">
                  <Power className="h-6 w-6" />
                </Button>
                <div />

                <div />
                <Button
                  onClick={() => sendMotor("backward")}
                  className="h-16 w-16 rounded-full bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  title="Backward (hold)"
                >
                  <ChevronDown className="h-6 w-6" />
                </Button>
                <div />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed lg:col-span-1">
          <CardHeader>
            <CardTitle className="tracking-tight">Servo Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => sendServo("open")} className="h-12 rounded-full bg-gradient-to-b from-green-600 to-green-500 text-white shadow-md hover:scale-105 active:scale-95 transition-transform">
                <Unlock className="h-5 w-5 mr-2" /> Open
              </Button>
              <Button onClick={() => sendServo("close")} variant="secondary" className="h-12 rounded-full bg-gradient-to-b from-amber-600 to-amber-500 text-white shadow-md hover:scale-105 active:scale-95 transition-transform">
                <Lock className="h-5 w-5 mr-2" /> Close
              </Button>
            </div>
            <div className="pt-2">
              <div className="text-sm text-muted-foreground mb-2">Position</div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((status.servoPosition - 70) / (180 - 70)) * 100))}%`
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default FeedPage; 