import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'
import { Badge } from './Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card'
import { Input } from './Input'
import { Textarea } from './Textarea'
import { Label } from './Label'
import { Separator } from './Separator'
import { Progress } from './Progress'
import { Slider } from './Slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './Dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table'
import { Skeleton } from './Skeleton'
import { Alert, AlertDescription, AlertTitle } from './Alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion'
import { Switch } from './Switch'

const meta: Meta = { title: 'Design System/Primitives' }
export default meta

export const Buttons: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-6">
      <Button>Default</Button>
      <Button variant="editorial">Editorial</Button>
      <Button variant="rouge">Rouge</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
}

export const Badges: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-6">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="muted">Muted</Badge>
      <Badge variant="destructive">Rouge</Badge>
    </div>
  ),
}

export const Cards: StoryObj = {
  render: () => (
    <div className="max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Editorial card</CardTitle>
          <CardDescription>Hairline edges, sharp corners, generous whitespace.</CardDescription>
        </CardHeader>
        <CardContent>Body copy set in the geometric sans.</CardContent>
      </Card>
    </div>
  ),
}

export const Fields: StoryObj = {
  render: () => (
    <div className="max-w-sm space-y-4 p-6">
      <div className="space-y-1.5">
        <Label htmlFor="story-input">Campaign name</Label>
        <Input id="story-input" placeholder="Summer product launch" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="story-textarea">Brief</Label>
        <Textarea id="story-textarea" placeholder="Describe the offer..." />
      </div>
      <div className="space-y-1.5">
        <Label>Channel</Label>
        <Select>
          <SelectTrigger><SelectValue placeholder="Select a channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="meta">Meta</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="story-switch" />
        <Label htmlFor="story-switch">Published</Label>
      </div>
      <div className="space-y-1.5">
        <Label>Progress</Label>
        <Progress value={60} />
      </div>
      <div className="space-y-1.5">
        <Label>Radius</Label>
        <Slider defaultValue={[0]} max={32} />
      </div>
      <Separator />
      <p className="text-eyebrow text-muted-foreground">Eyebrow label style</p>
    </div>
  ),
}

export const TabsStory: StoryObj = {
  render: () => (
    <div className="p-6">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview panel.</TabsContent>
        <TabsContent value="style">Style panel.</TabsContent>
      </Tabs>
    </div>
  ),
}

export const Feedback: StoryObj = {
  render: () => (
    <div className="max-w-md space-y-4 p-6">
      <Alert>
        <AlertTitle>Dev link ready</AlertTitle>
        <AlertDescription>Copy the unguessable preview link for internal review.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Validation failed</AlertTitle>
        <AlertDescription>Every journey needs exactly one entry point.</AlertDescription>
      </Alert>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Impressions</TableCell>
            <TableCell>12,400</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Skeleton className="h-10 w-full" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
          <TooltipContent>Editorial tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog>
        <DialogTrigger asChild><Button variant="editorial">Open dialog</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete campaign</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Style section</AccordionTrigger>
          <AccordionContent>Section controls live here.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}
