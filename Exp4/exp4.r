library(ggplot2)
library(dplyr)

# Load data
data <- read.csv("Datasets/crime.csv")

# Plot the data
# Plot 1: Bar plot of the number of crimes in each category
ggplot(data, aes(x = Category)) +
  geom_bar() +
  xlab("Category") +
  ylab("Number of Crimes") +
  ggtitle("Number of Crimes in Each Category")

# save plot
ggsave("Plots/plot1.png")