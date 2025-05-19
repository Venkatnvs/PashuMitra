import { useState, useRef } from "react";
import { Camera, Upload, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";

const DiseasePage = () => {
  const [activeTab, setActiveTab] = useState("camera");
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Disease Detectio Page</h2>
        <p className="text-center text-muted-foreground text-2xl pt-8">
          Coming Soon...
        </p>
      </div>
    </MainLayout>
  )

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setImage(null);
    setResult(null);
    
    if (value === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL("image/jpeg");
      setImage(imageDataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = () => {
    if (!image) return;
    
    setAnalyzing(true);
    // Simulating analysis
    setTimeout(() => {
      setResult({
        disease: "Foot and Mouth Disease",
        confidence: 89,
        treatment: "Consult a veterinarian immediately. Keep the animal isolated."
      });
      setAnalyzing(false);
    }, 2000);
  };

  const resetProcess = () => {
    setImage(null);
    setResult(null);
    if (activeTab === "camera") {
      startCamera();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Start camera when component mounts if camera tab is active
  useState(() => {
    if (activeTab === "camera") {
      startCamera();
    }
    
    // Clean up when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Disease Detection</h2>
        <p className="text-muted-foreground">
          Take a photo or upload an image of your cattle to detect potential diseases.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="camera">
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="camera" className="mt-0">
          <Card className="border-2 border-dashed">
            <CardContent className="p-0 overflow-hidden">
              {!image ? (
                <div className="aspect-video relative bg-muted">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  <Button 
                    onClick={captureImage}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-full h-14 w-14 p-0"
                  >
                    <Camera className="h-6 w-6" />
                  </Button>
                </div>
              ) : (
                <div className="aspect-video relative bg-muted">
                  <img 
                    src={image} 
                    alt="Captured" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="upload" className="mt-0">
          <Card className="border-2 border-dashed">
            <CardContent className="p-0 overflow-hidden">
              {!image ? (
                <div className="aspect-video flex flex-col items-center justify-center bg-muted p-6">
                  <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground text-center mb-4">
                    Upload or drag and drop an image
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    Select Image
                  </Button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="aspect-video relative bg-muted">
                  <img 
                    src={image} 
                    alt="Uploaded" 
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {image && !result && (
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={resetProcess}
            className="flex items-center"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={analyzeImage}
            disabled={analyzing}
            className="flex items-center"
          >
            {analyzing ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze Image
              </>
            )}
          </Button>
        </div>
      )}
      
      {result && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Detection Result</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Detected Disease</p>
                    <p className="font-medium">{result.disease}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <div className="flex items-center">
                      <div className="w-full bg-muted h-2 rounded-full mr-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm">{result.confidence}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recommended Action</p>
                    <p>{result.treatment}</p>
                  </div>
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={resetProcess}>
                    New Scan
                  </Button>
                  <Button>Contact Vet</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
};

export default DiseasePage; 