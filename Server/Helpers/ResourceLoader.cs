using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace gameroombookingsys.Helpers
{
    /// <summary>
    /// Helper class for loading localized resources from JSON files.
    /// </summary>
    public static class ResourceLoader
    {
        /// <summary>
        /// Loads resources from a JSON file for the specified language and resource name.
        /// </summary>
        /// <param name="language">Language code (e.g., "fi", "en")</param>
        /// <param name="resourceName">Resource file name without extension (e.g., "Email", "Errors")</param>
        /// <param name="attemptedFallback">Internal parameter to prevent infinite recursion</param>
        /// <returns>Dictionary of resource keys and values</returns>
        public static async Task<Dictionary<string, string>> LoadResourcesAsync(string language, string resourceName, bool attemptedFallback = false)
        {
            // Normalize language
            language = language.ToLower();
            if (language != "en" && language != "fi")
            {
                language = "fi"; // Default to Finnish
            }

            string resourceFile = $"{resourceName}.json";
            string resourcePath = FindFile(Path.Combine("Resources", "locales", language), resourceFile);

            if (File.Exists(resourcePath))
            {
                try
                {
                    string jsonContent = await File.ReadAllTextAsync(resourcePath);
                    var resources = JsonSerializer.Deserialize<Dictionary<string, string>>(jsonContent);
                    return resources ?? new Dictionary<string, string>();
                }
                catch (JsonException)
                {
                    // If JSON parsing fails, return empty dictionary
                    return new Dictionary<string, string>();
                }
                catch (Exception ex)
                {
                    // Log unexpected exceptions (e.g., IO errors, file permission issues)
                    Console.Error.WriteLine($"Error loading resource file '{resourcePath}': {ex}");
                    return new Dictionary<string, string>();
                }
            }

            // Fallback: try to load Finnish if requested language not found
            // Prevent infinite recursion by checking if we've already attempted fallback
            if (language != "fi" && !attemptedFallback)
            {
                return await LoadResourcesAsync("fi", resourceName, attemptedFallback: true);
            }

            return new Dictionary<string, string>();
        }

        /// <summary>
        /// Gets a localized string from resources.
        /// </summary>
        /// <param name="language">Language code</param>
        /// <param name="resourceName">Resource file name</param>
        /// <param name="key">Resource key</param>
        /// <param name="defaultValue">Default value if key not found</param>
        /// <returns>Localized string</returns>
        public static async Task<string> GetStringAsync(string language, string resourceName, string key, string defaultValue = "")
        {
            var resources = await LoadResourcesAsync(language, resourceName);
            return resources.GetValueOrDefault(key, defaultValue);
        }

        /// <summary>
        /// Finds a file in the specified directory, trying multiple locations.
        /// </summary>
        private static string FindFile(string directory, string fileName)
        {
            // Try base directory first
            string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, directory, fileName);
            if (File.Exists(path))
                return path;

            // Try current directory
            path = Path.Combine(Directory.GetCurrentDirectory(), directory, fileName);
            if (File.Exists(path))
                return path;

            // Try relative path
            path = Path.Combine(directory, fileName);
            return path;
        }
    }
}

