import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import MainLayout from "@/components/layout/MainLayout";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, Dialog } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const feedSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
});

const FeedPage = () => {
  const [feeds, setFeeds] = useState([
    { id: 1, name: "Hay", quantity: 250, unit: "kg", lastUpdated: "2 days ago" },
    { id: 2, name: "Grain", quantity: 85, unit: "kg", lastUpdated: "1 day ago" },
    { id: 3, name: "Silage", quantity: 120, unit: "kg", lastUpdated: "5 days ago" },
  ]);
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState(null);

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Feed Page</h2>
        <p className="text-center text-muted-foreground text-2xl pt-8">
          Coming Soon...
        </p>
      </div>
    </MainLayout>
  )
  
  const addForm = useForm({
    resolver: zodResolver(feedSchema),
    defaultValues: {
      name: "",
      quantity: "",
      unit: "kg",
    }
  });
  
  const updateForm = useForm({
    resolver: zodResolver(z.object({
      quantity: z.coerce.number(),
    })),
    defaultValues: {
      quantity: 0,
    }
  });
  
  const onAddSubmit = (data) => {
    const newFeed = {
      id: feeds.length + 1,
      ...data,
      lastUpdated: "Just now",
    };
    
    setFeeds([...feeds, newFeed]);
    setAddDialogOpen(false);
    addForm.reset();
    toast.success("New feed added successfully!");
  };

  const openUpdateDialog = (feed) => {
    setSelectedFeed(feed);
    updateForm.setValue("quantity", 0);
    setUpdateDialogOpen(true);
  };
  
  const onUpdateSubmit = (data) => {
    if (!selectedFeed) return;
    
    const updatedFeeds = feeds.map(feed => {
      if (feed.id === selectedFeed.id) {
        return {
          ...feed,
          quantity: feed.quantity + data.quantity,
          lastUpdated: "Just now",
        };
      }
      return feed;
    });
    
    setFeeds(updatedFeeds);
    setUpdateDialogOpen(false);
    updateForm.reset();
    toast.success(`Feed ${data.quantity > 0 ? "added" : "removed"} successfully!`);
  };
  
  const totalFeed = feeds.reduce((total, feed) => {
    return total + feed.quantity;
  }, 0);

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Feed Inventory</h2>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Feed
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Feed</DialogTitle>
              <DialogDescription>
                Add a new type of feed to your inventory.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Feed Name</Label>
                <Input id="name" {...addForm.register("name")} />
                {addForm.formState.errors.name && (
                  <p className="text-red-500 text-xs">{addForm.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number"
                    {...addForm.register("quantity")}
                  />
                  {addForm.formState.errors.quantity && (
                    <p className="text-red-500 text-xs">{addForm.formState.errors.quantity.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" {...addForm.register("unit")} />
                  {addForm.formState.errors.unit && (
                    <p className="text-red-500 text-xs">{addForm.formState.errors.unit.message}</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Feed</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Total Feed Available</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <p className="text-5xl font-bold mb-2">{totalFeed}</p>
              <p className="text-muted-foreground">kilograms</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <h3 className="text-lg font-semibold mb-4">Feed Breakdown</h3>
      
      <div className="space-y-4">
        {feeds.map((feed) => (
          <Card key={feed.id}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{feed.name}</h4>
                <span className="text-sm text-muted-foreground">
                  Updated {feed.lastUpdated}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-2xl font-semibold">
                  {feed.quantity} <span className="text-sm font-normal">{feed.unit}</span>
                </p>
                
                <div className="flex gap-2">
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => {
                      openUpdateDialog(feed);
                      updateForm.setValue("quantity", -10);
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    size="icon"
                    onClick={() => {
                      openUpdateDialog(feed);
                      updateForm.setValue("quantity", 10);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Feed Quantity</DialogTitle>
            <DialogDescription>
              {selectedFeed && `Update the quantity of ${selectedFeed.name}.`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFeed && (
            <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="update-quantity">Quantity ({selectedFeed.unit})</Label>
                <div className="flex items-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      const current = updateForm.getValues("quantity");
                      updateForm.setValue("quantity", current - 5);
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input 
                    id="update-quantity" 
                    className="text-center mx-2"
                    type="number"
                    {...updateForm.register("quantity")}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      const current = updateForm.getValues("quantity");
                      updateForm.setValue("quantity", current + 5);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {updateForm.formState.errors.quantity && (
                  <p className="text-red-500 text-xs">{updateForm.formState.errors.quantity.message}</p>
                )}
              </div>
              
              <Separator />
              
              <div className="pt-2">
                <p className="text-sm mb-2">Result:</p>
                <p className="font-medium">
                  {selectedFeed.quantity} {selectedFeed.unit} {' '}
                  <span className={updateForm.watch("quantity") >= 0 ? "text-green-500" : "text-red-500"}>
                    {updateForm.watch("quantity") >= 0 ? '+' : ''}{updateForm.watch("quantity")}
                  </span>
                  {' = '}
                  <span className="font-bold">
                    {selectedFeed.quantity + updateForm.watch("quantity")} {selectedFeed.unit}
                  </span>
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default FeedPage; 