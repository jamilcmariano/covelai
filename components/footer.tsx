export default function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} CoverLetterAI. All rights reserved.</p>
        <p className="mt-1">Powered by AI to help you land your dream job.</p>
      </div>
    </footer>
  )
}
