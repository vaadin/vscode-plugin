import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as tar from 'tar';
import { resolveVaadinHomeDirectory } from './projectFilesHelpers';

/**
 * Represents a GitHub release.
 */
interface GitHubRelease {
  id: number;
  name: string;
  tag_name: string;
  prerelease: boolean;
}

/**
 * Represents JBR SDK information.
 */
interface JBRSdkInfo {
  arch: string;
  sdkType: string;
  url: string;
}

const JETBRAINS_GITHUB_RELEASES_PAGE = 'https://api.github.com/repos/JetBrains/JetBrainsRuntime/releases';
const TAR_GZ = '.tar.gz';

/**
 * Utility class for downloading JetBrains Runtime for the current architecture.
 */
class JetbrainsRuntimeUtil {
  /**
   * Determines the current architecture string used in JetBrains releases.
   */
  private static getArchitecture(): string {
    const arch = process.arch;
    const platform = process.platform;
    let prefix = platform === 'darwin' ? 'osx' : platform === 'win32' ? 'windows' : 'linux';
    let suffix = arch === 'arm64' ? 'aarch64' : arch === 'ia32' ? 'x86' : 'x64';
    return `${prefix}-${suffix}`;
  }

  /**
   * Fetches the latest JBR release from GitHub.
   */
  private static async findLatestJBRRelease(): Promise<GitHubRelease> {
    const response = await axios.get<GitHubRelease[]>(JETBRAINS_GITHUB_RELEASES_PAGE);
    const releases = response.data.filter((r) => !r.prerelease);
    releases.sort((a, b) => a.tag_name.localeCompare(b.tag_name));
    return releases[releases.length - 1]; // Latest stable release
  }

  /**
   * Finds the correct JBR SDK URL for the current architecture.
   */
  private static async findJBRDownloadUrl(release: GitHubRelease): Promise<string | null> {
    const releaseDetails = await axios.get<{ body: string }>(`${JETBRAINS_GITHUB_RELEASES_PAGE}/${release.id}`);
    const sdkInfo = JetbrainsRuntimeUtil.findCorrectReleaseForArchitecture(releaseDetails.data.body);
    return sdkInfo?.url ?? null;
  }

  /**
   * Parses the release body to extract download URLs.
   */
  private static findCorrectReleaseForArchitecture(body: string): JBRSdkInfo | null {
    const lines = body.split('\n');
    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 4) continue;
      const arch = parts[1].trim();
      const sdkType = parts[2].replace('*', '').trim();
      const url = parts[3].replace(/\[.*]/, '').replace(/[()]/g, '').trim();

      if (sdkType === 'JBRSDK' && url.endsWith(TAR_GZ) && arch === JetbrainsRuntimeUtil.getArchitecture()) {
        return { arch, sdkType, url };
      }
    }
    return null;
  }

  /**
   * Downloads the latest JBR version and saves it to the workspace.
   */
  public static async downloadLatestJBR(): Promise<string | undefined> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Downloading JetBrains Runtime...',
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const latestRelease = await JetbrainsRuntimeUtil.findLatestJBRRelease();
          const downloadUrl = await JetbrainsRuntimeUtil.findJBRDownloadUrl(latestRelease);

          if (!downloadUrl) {
            vscode.window.showErrorMessage('No suitable JetBrains Runtime found.');
            return;
          }

          const filename = path.basename(downloadUrl);
          const vaadinHomeFolder = resolveVaadinHomeDirectory();
          const downloadPath = path.join(vaadinHomeFolder, filename);
          const jdksPath = path.join(vaadinHomeFolder, 'jdk');
          const extractPath = path.join(jdksPath, filename.replace(TAR_GZ, ''));

          if (!fs.existsSync(jdksPath)) {
            fs.mkdirSync(jdksPath, { recursive: true });
          }

          if (fs.existsSync(extractPath)) {
            vscode.window.showInformationMessage(`JetBrains Runtime already exists at ${extractPath}`);
            return extractPath;
          }

          await JetbrainsRuntimeUtil.downloadFile(downloadUrl, downloadPath, progress, token);
          await JetbrainsRuntimeUtil.extractArchive(downloadPath, extractPath);

          vscode.window.showInformationMessage(`JetBrains Runtime downloaded to ${extractPath}`);

          return extractPath;
        } catch (error) {
          vscode.window.showErrorMessage(`Error downloading JetBrains Runtime: ${error}`);
        }
      },
    );
  }

  /**
   * Downloads a file and updates the progress.
   */
  private static async downloadFile(
    url: string,
    destination: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      let receivedBytes = 0;

      const makeRequest = (currentUrl: string) => {
        https
          .get(currentUrl, (response) => {
            // Handle redirection (HTTP 3xx)
            if (
              response.statusCode &&
              response.statusCode >= 300 &&
              response.statusCode < 400 &&
              response.headers.location
            ) {
              const newUrl = response.headers.location.startsWith('http')
                ? response.headers.location
                : new URL(response.headers.location, currentUrl).href;
              makeRequest(newUrl);
              return;
            }

            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download file. HTTP Status: ${response.statusCode}`));
              return;
            }

            const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
            response.pipe(file);

            response.on('data', (chunk) => {
              receivedBytes += chunk.length;
              if (totalBytes > 0) {
                const percent = Math.round((receivedBytes / totalBytes) * 100);
                progress.report({
                  message: `${percent}%`,
                  increment: (chunk.length / totalBytes) * 100,
                });
              }
            });

            file.on('finish', () => {
              file.close();
              resolve();
            });

            file.on('error', reject);
          })
          .on('error', reject);
      };

      makeRequest(url);

      token.onCancellationRequested(() => {
        fs.unlink(destination, () => {});
        reject(new Error('Download canceled'));
      });
    });
  }

  /**
   * Extracts a `.tar.gz` archive.
   */
  private static async extractArchive(archivePath: string, extractPath: string): Promise<void> {
    await tar.x({
      file: archivePath,
      cwd: path.dirname(extractPath),
    });
    fs.unlinkSync(archivePath);
  }
}

export default JetbrainsRuntimeUtil;
