global using Community.VisualStudio.Toolkit;
global using Microsoft.VisualStudio.Shell;
global using System;
global using Task = System.Threading.Tasks.Task;
using Community.VisualStudio.Toolkit.DependencyInjection.Microsoft;
using DocuGen.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.Shell.Interop;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;

namespace DocuGen
{
    [PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
    [ProvideAutoLoad(UIContextGuids80.SolutionExists, PackageAutoLoadFlags.BackgroundLoad)]
    [InstalledProductRegistration(Vsix.Name, Vsix.Description, Vsix.Version)]
    [ProvideMenuResource("Menus.ctmenu", 1)]
    [Guid(PackageGuids.DocuGenString)]
    public sealed class DocuGenPackage : MicrosoftDIToolkitPackage<ToolkitPackage>
    {
        protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
        {
            await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

            // Ensure that you first call the base.InitializeAsync method.
            await base.InitializeAsync(cancellationToken, progress);

            var solution = await GetServiceAsync(typeof(SVsSolution)) as IVsSolution;
            if (solution != null)
            {
                solution.AdviseSolutionEvents(new SolutionEventsHandler(), out uint cookie);
            }

            await this.RegisterCommandsAsync();
        }

        protected override void InitializeServices(IServiceCollection services)
        {
            services.AddSingleton<ICoreLogic, CoreLogic>();
        }
    }
}