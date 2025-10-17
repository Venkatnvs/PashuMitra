import { useState, useEffect, useRef } from "react";
import { Plus, Settings, Camera, RotateCw, X, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import MainLayout from "@/components/layout/MainLayout";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createCattle, getAllCattle, deleteCattle } from "@/firebase/services/cattel";
import { useNavigate } from "react-router-dom";
import { getAllEvents } from '@/firebase/services/event';

const cattleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  image: z.string().min(1, "Image is required"),
});

const InjectionPage = () => {
  const [cattles, setCattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [imageMode, setImageMode] = useState("camera"); // "camera" or "upload"
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cattleToDelete, setCattleToDelete] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  const [nextInjections, setNextInjections] = useState({});
  const [query, setQuery] = useState("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(cattleSchema),
    defaultValues: {
      name: "",
      type: "",
      image: "",
    }
  });

  useEffect(() => {
    const unsubscribe = getAllCattle((cattleList) => {
      setCattles(cattleList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAllNextInjections = async () => {
      const results = {};
      for (const cattle of cattles) {
        const events = await getAllEvents(cattle.id);
        const mainEvent = events.find(e => e.isInjection && e.isRepeated);
        if (!mainEvent) {
          results[cattle.id] = null;
          continue;
        }
        const isOccurrenceCompleted = (event, occurrenceDate) => {
          if (!event.isRepeated || !event.completedTill) return false;
          return new Date(occurrenceDate) <= new Date(event.completedTill);
        };
        // Find the first uncompleted occurrence that is today or in the future
        let nextDate = new Date(mainEvent.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let found = false;
        for (let i = 0; i < 100; i++) { // limit to 100 occurrences for safety
          const occurrenceDate = new Date(nextDate);
          occurrenceDate.setHours(0, 0, 0, 0);
          if (!isOccurrenceCompleted(mainEvent, nextDate.toISOString()) && occurrenceDate >= today) {
            results[cattle.id] = nextDate.toISOString();
            found = true;
            break;
          }
          nextDate.setDate(nextDate.getDate() + mainEvent.repeatDuration);
        }
        if (!found) {
          results[cattle.id] = null;
        }
      }
      setNextInjections(results);
    };
    if (cattles.length > 0) fetchAllNextInjections();
  }, [cattles]);

  // Function to start the camera
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: isFrontCamera ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Could not access camera. Please check permissions.");
    }
  };

  // Function to toggle camera facing mode
  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    if (isCameraOpen) {
      startCamera();
    }
  };

  // Function to capture image
  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      
      setCapturedImage(imageDataUrl);
      setValue("image", imageDataUrl);
      
      // Stop the camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      setIsCameraOpen(false);
    }
  };

  // Function to stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const onSubmit = async (data) => {
    if (!data.image) {
      toast.error("Please add an image first");
      return;
    }
    
    try {
      setLoading(true);
      await createCattle(data);
      setOpen(false);
      reset();
      setCapturedImage("");
      toast.success("New cattle added successfully!");
    } catch (error) {
      console.error("Error adding cattle:", error);
      toast.error("Failed to add cattle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    stopCamera();
    setCapturedImage("");
    setImageMode("camera");
    reset();
    setOpen(false);
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target.result;
        setCapturedImage(imageDataUrl);
        setValue("image", imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClick = (cattle) => {
    setCattleToDelete(cattle);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!cattleToDelete) return;
    
    try {
      setLoading(true);
      await deleteCattle(cattleToDelete.id);
      toast.success("Cattle deleted successfully");
    } catch (error) {
      console.error("Error deleting cattle:", error);
      toast.error("Failed to delete cattle");
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setCattleToDelete(null);
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Cattles</h2>

        {/* Mobile search */}
        <div className="sm:hidden">
          <Input
            placeholder="Search by name or type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Input
            placeholder="Search by name or type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64 h-9"
          />
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => {
          if (!isOpen) closeDialog();
          setOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-transform">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px] sm:rounded-lg rounded-none max-w-[100vw] sm:h-auto h-[100dvh] max-h-[100dvh] overflow-y-auto p-4">
            <DialogHeader>
              <DialogTitle>Add New Cattle</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                {/* Image Mode Selection */}
                {!capturedImage && (
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      variant={imageMode === "camera" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageMode("camera")}
                      className="flex-1"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Camera
                    </Button>
                    <Button
                      type="button"
                      variant={imageMode === "upload" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageMode("upload")}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                )}

                {isCameraOpen ? (
                  <div className="relative">
                    <video 
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-[220px] sm:h-[250px] object-cover rounded-lg"
                    />
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="icon" 
                        className="rounded-full" 
                        onClick={toggleCamera}
                      >
                        <RotateCw className="h-5 w-5" />
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="secondary" 
                        className="rounded-full px-6"
                        onClick={captureImage}
                      >
                        Capture
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="rounded-full" 
                        onClick={stopCamera}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : capturedImage ? (
                  <div className="relative">
                    <img 
                      src={capturedImage} 
                      alt="Selected" 
                      className="w-full h-[220px] sm:h-[250px] object-cover rounded-lg"
                    />
                    
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 rounded-full"
                      onClick={() => {
                        setCapturedImage("");
                        setValue("image", "");
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ) : imageMode === "camera" ? (
                  <div 
                    className="flex flex-col items-center justify-center h-[220px] sm:h-[250px] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={startCamera}
                  >
                    <Camera className="h-10 w-10 mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground font-medium">Click to take a photo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[220px] sm:h-[250px] border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
                    <Upload className="h-10 w-10 mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground font-medium mb-2">Upload an image</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      Choose File
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Max size: 5MB</p>
                  </div>
                )}
                {errors.image && (
                  <p className="text-red-500 text-xs">{errors.image.message}</p>
                )}
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right hidden sm:block">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Name"
                    className="col-span-4 sm:col-span-3" 
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs col-span-4 sm:col-start-2 sm:col-span-3">{errors.name.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right hidden sm:block">Type</Label>
                  <Input 
                    id="type" 
                    className="col-span-4 sm:col-span-3" 
                    placeholder="Cow, Bull, etc."
                    {...register("type")}
                  />
                  {errors.type && (
                    <p className="text-red-500 text-xs col-span-4 sm:col-start-2 sm:col-span-3">{errors.type.message}</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                <Button variant="outline" type="button" onClick={closeDialog} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                  {loading ? "Adding..." : "Add Cattle"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <ScrollArea className="h-[calc(100vh-12rem)] sm:h-[calc(100vh-13rem)]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading cattle...</p>
          </div>
        ) : cattles.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64">
            <p className="text-muted-foreground mb-4">No cattle added yet</p>
            <Button onClick={() => setOpen(true)} className="bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-sm w-full sm:w-auto">Add Your First Cattle</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cattles
              .filter(c => {
                if (!query.trim()) return true;
                const q = query.toLowerCase();
                return (c.name || "").toLowerCase().includes(q) || (c.type || "").toLowerCase().includes(q);
              })
              .map((cattle) => (
              <Card key={cattle.id} className="relative overflow-hidden h-full flex flex-col p-2 hover:shadow-lg transition-shadow">
                <div 
                  className={`absolute top-0 left-0 w-1 h-full ${
                    cattle.status === "Sick" ? "bg-red-500" : "bg-green-500"
                  }`}
                />
                
                <CardHeader className="py-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base sm:text-lg">{cattle.name}</CardTitle>
                      <CardDescription className="text-sm">{cattle.type}</CardDescription>
                    </div>
                    <div className="flex">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                        onClick={() => handleDeleteClick(cattle)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-grow py-0">
                  <div className="aspect-video mb-2 overflow-hidden rounded-md bg-muted">
                    {cattle.image ? (
                      <img 
                        src={cattle.image} 
                        alt={cattle.name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">No image</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p>{cattle.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Next Injection</p>
                      <p>{nextInjections[cattle.id] ? new Date(nextInjections[cattle.id]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "None scheduled"}</p>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full hover:scale-[1.02] transition-transform"
                    onClick={() => navigate(`/cattle/${cattle.id}`)}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {cattleToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default InjectionPage; 