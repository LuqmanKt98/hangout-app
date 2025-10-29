"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  HelpCircle,
  Mail,
  Bug,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  Send,
  ExternalLink,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface HelpSupportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpSupportModal({ open, onOpenChange }: HelpSupportModalProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
  })
  const [bugForm, setBugForm] = useState({
    title: "",
    description: "",
  })

  const handleContactSubmit = async () => {
    if (!contactForm.subject || !contactForm.message) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      // In a real app, this would send to your support system
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Message sent",
        description: "We'll get back to you as soon as possible",
      })

      setContactForm({ subject: "", message: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleBugSubmit = async () => {
    if (!bugForm.title || !bugForm.description) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      // In a real app, this would send to your bug tracking system
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve!",
      })

      setBugForm({ title: "", description: "" })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit bug report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const faqs = [
    {
      question: "How do I create availability?",
      answer:
        "Go to the 'My Avales' tab, click 'Add Availability', select your date, time, and energy level, then choose who to share it with. Your friends will be able to see when you're available and send you hangout requests.",
    },
    {
      question: "How do hangout requests work?",
      answer:
        "When you see a friend's availability, you can send them a hangout request by selecting a time within their available window. They'll receive a notification and can accept or decline your request. Once accepted, it becomes a confirmed plan.",
    },
    {
      question: "What are energy levels?",
      answer:
        "Energy levels (Low, High, Virtual) help you communicate what kind of hangout you're up for. 'Low' might be a chill coffee, 'High' could be an active outing, and 'Virtual' is for online hangouts.",
    },
    {
      question: "How do I add friends?",
      answer:
        "Go to the 'You' tab, click 'Add Friend', search for your friend by email, and send them a friend request. Once they accept, you'll be able to see each other's availability and send hangout requests.",
    },
    {
      question: "What are groups?",
      answer:
        "Groups let you organize your friends and share availability with multiple people at once. Create a group, add members, and when you create availability, you can share it with the entire group.",
    },
    {
      question: "How do I delete my account?",
      answer:
        "Go to Settings > Danger Zone > Delete Account. Please note that this action is permanent and will delete all your data including availability, requests, and friend connections.",
    },
    {
      question: "Can I control who sees my availability?",
      answer:
        "Yes! Go to Privacy Settings to control who can see your availability, send you requests, and view your profile. You can choose between Everyone, Friends Only, or Nobody.",
    },
    {
      question: "How do I cancel a hangout request?",
      answer:
        "Go to the 'Requests' tab, find your sent request, and click the cancel button. The request will be removed and your friend will be notified.",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="w-5 h-5" />
            Help & Support
          </DialogTitle>
          <DialogDescription>Get help, report issues, or learn more about the app</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="faq" className="pt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="bug">Report Bug</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Frequently Asked Questions
              </h3>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Support
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    placeholder="What do you need help with?"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Describe your issue or question..."
                    rows={6}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  />
                </div>
                <Button onClick={handleContactSubmit} disabled={isSending} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {isSending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                You can also reach us directly at{" "}
                <a href="mailto:support@hangoutapp.com" className="text-primary hover:underline">
                  support@hangoutapp.com
                </a>
              </p>
            </Card>
          </TabsContent>

          {/* Bug Report Tab */}
          <TabsContent value="bug" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Report a Bug
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Bug Title</Label>
                  <Input
                    placeholder="Brief description of the bug"
                    value={bugForm.title}
                    onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What happened? What did you expect to happen? Steps to reproduce..."
                    rows={6}
                    value={bugForm.description}
                    onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleBugSubmit} disabled={isSending} className="w-full">
                  <Bug className="w-4 h-4 mr-2" />
                  {isSending ? "Submitting..." : "Submit Bug Report"}
                </Button>
              </div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Thank you for helping us improve! Your bug reports help make the app better for everyone.
              </p>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">About Hangout App</h3>
                <p className="text-sm text-muted-foreground">
                  Hangout App helps you coordinate spontaneous hangouts with friends. Share your availability, send
                  requests, and make plans—all in one place.
                </p>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">October 2025</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold mb-2">Legal</h3>
              <Button variant="ghost" className="w-full justify-between" asChild>
                <a href="/terms" target="_blank">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Terms of Service
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" className="w-full justify-between" asChild>
                <a href="/privacy" target="_blank">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Privacy Policy
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </Card>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm text-center">
                Made with ❤️ for spontaneous hangouts
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

