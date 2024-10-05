using Microsoft.Web.WebView2.Core;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace DocuGen.Window
{
    /// <summary>
    /// Interaction logic for DocuGenToolWindowControl.
    /// </summary>
    public partial class DocuGenToolWindowControl : UserControl
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="DocuGenToolWindowControl"/> class.
        /// </summary>
        public DocuGenToolWindowControl()
        {
            this.InitializeComponent();
            InitializeWebViewAsync().ConfigureAwait(false).GetAwaiter().GetResult();

        }

        private async Task InitializeWebViewAsync()
        {
            // Set up the WebView2 environment explicitly
            //var env = await CoreWebView2Environment.CreateAsync();

            // Ensure the WebView2 environment is created
            await webView.EnsureCoreWebView2Async(null);

            // Load the HTML file into WebView2
            var htmlPath = Path.Combine(Directory.GetCurrentDirectory(), "WebContent", "index.html");
            webView.CoreWebView2.Navigate($"file:///{htmlPath}");

            // Handle messages sent from the WebView (JavaScript)
            webView.CoreWebView2.WebMessageReceived += WebView_WebMessageReceived;
        }

        private void WebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            // Handle messages from the WebView (e.g., button click)
            string message = e.TryGetWebMessageAsString();
            MessageBox.Show($"Message from WebView: {message}");

            // Optionally, send a message back to the WebView
            webView.CoreWebView2.PostWebMessageAsString("Message received in C#!");
        }

        /// <summary>
        /// Handles click on the button by displaying a message box.
        /// </summary>
        /// <param name="sender">The event sender.</param>
        /// <param name="e">The event args.</param>
        [SuppressMessage("Microsoft.Globalization", "CA1300:SpecifyMessageBoxOptions", Justification = "Sample code")]
        [SuppressMessage("StyleCop.CSharp.NamingRules", "SA1300:ElementMustBeginWithUpperCaseLetter", Justification = "Default event handler naming pattern")]
        private void button1_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show(
                string.Format(System.Globalization.CultureInfo.CurrentUICulture, "Invoked '{0}'", this.ToString()),
                "DocuGen");
        }
    }
}