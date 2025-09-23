import { useState, useRef, useEffect } from "react";
import { Camera, Upload, RotateCcw, CheckCircle2, History, Trash2, AlertTriangle, Clock, Activity, FileText, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MainLayout from "@/components/layout/MainLayout";
import { toast } from "sonner";
import { createDiseaseDetection, getAllDiseaseDetections, deleteDiseaseDetection } from "@/firebase/services/disease";
import { getAllCattle } from "@/firebase/services/cattel";
import { analyzeCattleImage } from "@/services/geminiService";

const DiseasePage = () => {
  const [activeTab, setActiveTab] = useState("camera");
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCattle, setSelectedCattle] = useState("");
  const [cattleList, setCattleList] = useState([]);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Load disease detection history
    const unsubscribeHistory = getAllDiseaseDetections((detections) => {
      setHistory(detections);
    });

    // Load cattle list
    const unsubscribeCattle = getAllCattle((cattle) => {
      setCattleList(cattle);
    });

    // Show demo mode notification if Gemini API key is not configured
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      toast.info("Demo mode: Using mock data for disease detection. Add VITE_GEMINI_API_KEY to enable real AI analysis.");
    }

    return () => {
      unsubscribeHistory();
      unsubscribeCattle();
    };
  }, []);

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

  const analyzeImage = async () => {
    if (!image) return;

    if (!selectedCattle) {
      toast.error("Please select a cattle first");
      return;
    }

    setAnalyzing(true);

    try {
      // Call Gemini API for analysis
      const analysisResult = await analyzeCattleImage(image);

      // Save to Firebase
      const detectionData = {
        cattleId: selectedCattle,
        cattleName: cattleList.find(c => c.id === selectedCattle)?.name || "Unknown",
        imageUrl: image,
        ...analysisResult,
        analyzedAt: new Date().toISOString()
      };

      await createDiseaseDetection(detectionData);

      setResult(analysisResult);
      toast.success("Analysis completed and saved!");
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error("Failed to analyze image. Please try again.");
    } finally {
      setAnalyzing(false);
    }
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

  const handleDeleteDetection = async (detectionId) => {
    try {
      await deleteDiseaseDetection(detectionId);
      toast.success("Detection record deleted successfully");
    } catch (error) {
      console.error("Error deleting detection:", error);
      toast.error("Failed to delete detection record");
    }
  };

  const handleViewDetails = (detection) => {
    setSelectedDetection(detection);
    setShowDetailsModal(true);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Start camera when component mounts if camera tab is active
  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    }

    // Clean up when component unmounts
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  return (
    <MainLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Disease Detection</h2>
            <p className="text-muted-foreground">
              Use AI-powered analysis to detect potential diseases in your cattle
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 hover:bg-muted/50"
          >
            <History className="h-4 w-4" />
            {showHistory ? 'Hide History' : 'View History'}
          </Button>
        </div>
      </div>

      {!showHistory ? (
        <>
          {/* Cattle Selection */}
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="border-2 border-dashed hover:shadow-sm transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Select Cattle
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cattleList.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">No cattle found</p>
                    <p className="text-sm text-muted-foreground">
                      Please add some cattle first to use disease detection
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {cattleList.map((cattle) => (
                      <Card
                        key={cattle.id}
                        className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${selectedCattle === cattle.id
                          ? 'ring-2 ring-primary bg-primary/5 scale-105'
                          : 'hover:bg-muted/50'
                          }`}
                        onClick={() => setSelectedCattle(cattle.id)}
                      >
                        <CardContent className="p-3">
                          <div className="text-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-primary font-semibold text-sm">
                                {(cattle.name || 'U').charAt(0)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-sm">{cattle.name || 'Unnamed'}</h3>
                            <p className="text-xs text-muted-foreground">{cattle.tag || 'No Tag'}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed hover:shadow-sm transition-shadow">
              <CardHeader className="pb-4">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="camera" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Camera
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="p-0 flex items-center justify-center">
                <Tabs value={activeTab} className="w-full flex items-center justify-center">
                  <TabsContent value="camera" className="mt-0 flex items-center justify-center">
                    {!image ? (
                      <div className="aspect-[4/3] relative bg-muted max-h-80 flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="text-center">
                            <Button
                              onClick={captureImage}
                              size="lg"
                              className="rounded-full h-20 w-20 p-0 shadow-xl hover:scale-110 transition-all duration-300 bg-green-600 hover:bg-green-700 border-4 border-white"
                            >
                              <Camera className="h-10 w-10" />
                            </Button>
                            <p className="text-white text-sm mt-3 font-medium">Tap to capture</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] relative bg-muted max-h-80 flex items-center justify-center">
                        <img
                          src={image}
                          alt="Captured"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="upload" className="mt-0">
                    {!image ? (
                      <div className="aspect-[4/3] flex flex-col items-center justify-center bg-muted p-6 max-h-80">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-10 w-10 text-primary" />
                          </div>
                          <p className="text-muted-foreground text-center mb-4 text-lg font-medium">
                            Upload or drag and drop an image
                          </p>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            size="lg"
                            className="hover:bg-primary hover:text-primary-foreground border-2"
                          >
                            Select Image
                          </Button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] relative bg-muted max-h-80 flex items-center justify-center">
                        <img
                          src={image}
                          alt="Uploaded"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {image && !result && (
            <div className="max-w-2xl mx-auto mt-4">
              <Card className="border-2 border-dashed hover:shadow-sm transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between gap-4">
                    <Button
                      variant="outline"
                      onClick={resetProcess}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                    <Button
                      onClick={analyzeImage}
                      disabled={analyzing || !selectedCattle}
                      size="lg"
                      className="flex items-center gap-2 flex-1 bg-green-600 hover:bg-green-700 shadow-md"
                    >
                      {analyzing ? (
                        <>
                          <div className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          Analyze Image
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {result && (
            <div className="max-w-4xl mx-auto mt-6">
              <Card className="border-2 border-dashed hover:shadow-sm transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="font-semibold text-xl">Detection Result</h3>
                        <Badge className={getSeverityColor(result.severity)}>
                          {result.severity || 'Unknown'} Severity
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Detected Disease</p>
                            <p className="font-medium text-lg">{result.disease}</p>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted h-3 rounded-full">
                                <div
                                  className="bg-primary h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${result.confidence}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{result.confidence}%</span>
                            </div>
                          </div>

                          {result.symptoms && result.symptoms.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Symptoms</p>
                              <div className="space-y-2">
                                {result.symptoms.map((symptom, index) => (
                                  <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm">
                                    {symptom}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Treatment</p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{result.treatment}</p>
                          </div>

                          {result.recommendations && result.recommendations.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Recommendations</p>
                              <ul className="space-y-1">
                                {result.recommendations.map((rec, index) => (
                                  <li key={index} className="text-sm flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="my-6" />

                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <Button variant="outline" onClick={resetProcess}>
                          New Scan
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      ) : (
        /* History Section */
        <div className="space-y-6">
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Detection History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No detection history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((detection) => (
                    <Card
                      key={detection.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewDetails(detection)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={detection.imageUrl}
                                alt="Detection"
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{detection.disease}</h4>
                                <Badge className={getSeverityColor(detection.severity)}>
                                  {detection.severity || 'Unknown'}
                                </Badge>
                                <Badge variant="outline">
                                  {detection.cattleName}
                                </Badge>
                              </div>

                              <p className="text-sm text-muted-foreground mb-2">
                                {detection.treatment}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(detection.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Activity className="h-3 w-3" />
                                  {detection.confidence}% confidence
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDetection(detection.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Detection Details
            </DialogTitle>
          </DialogHeader>

          {selectedDetection && (
            <div className="space-y-6">
              {/* Image and Basic Info */}
              <div className="flex items-start gap-6">
                <div className="w-48 h-48 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={selectedDetection.imageUrl}
                    alt="Detection"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-semibold text-2xl">{selectedDetection.disease}</h3>
                    <Badge className={getSeverityColor(selectedDetection.severity)}>
                      {selectedDetection.severity || 'Unknown'} Severity
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Cattle</p>
                      <p className="font-medium">{selectedDetection.cattleName}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted h-3 rounded-full">
                          <div
                            className="bg-primary h-3 rounded-full transition-all duration-500"
                            style={{ width: `${selectedDetection.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedDetection.confidence}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Analyzed At</p>
                      <p className="font-medium">{formatDate(selectedDetection.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detailed Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {selectedDetection.symptoms && selectedDetection.symptoms.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Symptoms</p>
                      <div className="space-y-2">
                        {selectedDetection.symptoms.map((symptom, index) => (
                          <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm">
                            {symptom}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedDetection.description || 'No description available'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Treatment</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedDetection.treatment}</p>
                  </div>

                  {selectedDetection.recommendations && selectedDetection.recommendations.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Recommendations</p>
                      <ul className="space-y-1">
                        {selectedDetection.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default DiseasePage; 