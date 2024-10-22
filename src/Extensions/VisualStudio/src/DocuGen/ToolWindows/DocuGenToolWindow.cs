using Community.VisualStudio.Toolkit.DependencyInjection.Core;
using DocuGen.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace DocuGen
{
    public class DocuGenToolWindow : BaseToolWindow<DocuGenToolWindow>
    {
        public override string GetTitle(int toolWindowId) => "DocuGen";

        public override Type PaneType => typeof(Pane);

        public async override Task<FrameworkElement> CreateAsync(int toolWindowId, CancellationToken cancellationToken)
        {
            // Retrieve the IServiceProvider
            var serviceProvider = await VS.GetServiceAsync<SToolkitServiceProvider<DocuGenPackage>, IToolkitServiceProvider<DocuGenPackage>>();

            // Retrieve your service from the IServiceProvider
            var core = serviceProvider.GetRequiredService<ICoreLogic>();

            return await Task.FromResult<FrameworkElement>(new DocuGenToolWindowControl(core));
        }

        [Guid("bd74bd7f-9b4b-4a7b-b201-1424e1f3351c")]
        internal class Pane : ToolkitToolWindowPane
        {
            public Pane()
            {
                BitmapImageMoniker = KnownMonikers.ToolWindow;
            }
        }
    }
}
