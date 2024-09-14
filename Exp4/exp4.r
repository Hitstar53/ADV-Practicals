# Required libraries
library(ggplot2)
library(dplyr)
library(lintr)
library(lubridate)

# Load data
data <- read.csv("Datasets/crime_cleaned.csv")

# Bar chart: Number of crimes per offense category
bar_chart <- data %>%
  group_by(offense_category_id) %>%
  summarise(Count = n()) %>%
  ggplot(aes(x = reorder(offense_category_id, -Count), y = Count)) +
  geom_bar(stat = "identity", fill = "steelblue") +
  theme_light() +
  labs(title = "Number of Crimes per Offense Category", x = "Offense Category", y = "Count") + 
  theme(axis.text.x = element_text(angle = 45, hjust = 1))

# Save Bar chart
ggsave("Exp4/Plots/bar_chart.png", plot = bar_chart)


# Pie chart: Percentage of crimes by neighborhood_id
pie_chart <- data %>%
  group_by(neighborhood_id) %>%
  summarise(Count = n()) %>%
  ggplot(aes(x = "", y = Count, fill = neighborhood_id)) +
  geom_bar(stat = "identity", width = 1) +
  coord_polar("y", start = 0) +
  theme_light() +
  labs(title = "Percentage of Crimes by Neighborhood ID", fill = "Neighborhood ID") +
  theme(legend.position = "none")

# Save Pie chart
ggsave("Exp4/Plots/pie_chart.png", plot = pie_chart)

# Histogram: Distribution of victim count by month
data$first_occurrence_date <- mdy_hms(data$first_occurrence_date)
data$year <- year(data$first_occurrence_date)

# Histogram: Victim count by year
histogram <- data %>%
  group_by(year) %>%
  summarise(total_victims = sum(victim_count, na.rm = TRUE)) %>%
  ggplot(aes(x = year, y = total_victims)) +
  geom_bar(stat = "identity", fill = "skyblue", color = "black") +
  labs(
    title = "Victim Count by Year",
    x = "Year",
    y = "Total Victim Count"
  ) +
  theme_light()

# Save Histogram
ggsave("Exp4/Plots/histogram.png", plot = histogram)

# Timeline chart: Number of crimes over time
data$month <- month(data$first_occurrence_date, label = TRUE, abbr = TRUE)
data$year_month <- as.Date(paste(data$year, data$month, "01", sep = "-"), format = "%Y-%b-%d")

# Count incidents per month and year
timeline_data <- data %>%
  group_by(year_month) %>%
  summarise(total_incidents = n())

# Timeline chart: Number of incidents by year and month
timeline_chart <- ggplot(timeline_data, aes(x = year_month, y = total_incidents)) +
  geom_line(color = "blue") +
  geom_point(color = "blue") +
  labs(
    title = "Number of Incidents by Month and Year",
    x = "Month-Year",
    y = "Number of Incidents"
  ) +
  theme_light()

# Save Timeline chart
ggsave("Exp4/Plots/timeline_chart.png", plot = timeline_chart)

# Scatter plot: Crimes plotted by geographic location (geo_x and geo_y)
crime_count_by_neighborhood <- data %>%
  group_by(neighborhood_id) %>%
  summarise(total_crimes = n())

# Scatter plot: Number of crimes by neighborhood_id
scatter_plot <- ggplot(crime_count_by_neighborhood, aes(x = neighborhood_id, y = total_crimes)) +
  geom_point(color = "blue") +
  labs(
    title = "Number of Crimes by Neighborhood ID",
    x = "Neighborhood ID",
    y = "Number of Crimes"
  ) +
  theme_light()

# Save Scatter plot
ggsave("Exp4/Plots/scatter_plot.png", plot = scatter_plot)

# Bubble plot: Number of victims per offense type
bubble_plot <- data %>%
  group_by(offense_type_id) %>%
  summarise(Total_Victims = sum(victim_count)) %>%
  ggplot(aes(x = offense_type_id, y = Total_Victims, size = Total_Victims)) +
  geom_point(color = "purple", alpha = 0.7) +
  theme_light() +
  labs(title = "Victims per Offense Type", x = "Offense Type", y = "Total Victims") +
  theme(axis.text.x = element_text(angle = 45, hjust = 1))

# Save Bubble plot
ggsave("Exp4/Plots/bubble_plot.png", plot = bubble_plot)